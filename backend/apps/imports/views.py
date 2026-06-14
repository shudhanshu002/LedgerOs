from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.groups.models import Group, GroupMembership
from apps.imports.models import ImportBatch, ImportDecision, ImportIssue, ImportRow
from apps.imports.serializers import (
    ImportBatchListSerializer,
    ImportBatchSerializer,
    ImportIssueDecisionSerializer,
    ImportIssueSerializer,
    ImportUploadSerializer,
)
from apps.imports.services.anomaly_detector import refresh_batch_summary
from apps.imports.services.parser import ImportParserError, create_import_batch_from_csv


def get_group_for_user(user, group_id: int) -> Group:
    """
    Returns group only if the logged-in user belongs to it.
    """

    try:
        return Group.objects.get(
            id=group_id,
            memberships__user=user,
        )
    except Group.DoesNotExist as exc:
        raise ValidationError("Group not found or you do not have access.") from exc


def user_is_group_admin(user, group: Group) -> bool:
    """
    Import review changes data, so only active group admins should approve decisions.
    """

    return GroupMembership.objects.filter(
        group=group,
        user=user,
        role=GroupMembership.Role.ADMIN,
        left_at__isnull=True,
    ).exists()


class ImportBatchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Import batch API.

    Supports:
    - list import batches
    - view detailed import report
    - upload CSV
    - list issues for one batch
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            ImportBatch.objects
            .filter(group__memberships__user=self.request.user)
            .select_related("group", "uploaded_by")
            .prefetch_related("rows__issues", "issues")
            .distinct()
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action == "list":
            return ImportBatchListSerializer

        return ImportBatchSerializer

    @action(
        detail=False,
        methods=["post"],
        url_path="upload",
        parser_classes=[MultiPartParser],
    )
    def upload(self, request):
        """
        Uploads CSV and produces an import report.

        Endpoint:
        POST /api/imports/upload/

        Form-data:
        - group_id
        - file

        Important:
        This does not create Expense rows immediately.
        It creates ImportBatch, ImportRow, and ImportIssue records.
        """

        serializer = ImportUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group = get_group_for_user(
            request.user,
            serializer.validated_data["group_id"],
        )

        if not user_is_group_admin(request.user, group):
            raise PermissionDenied("Only group admins can upload imports.")

        try:
            batch = create_import_batch_from_csv(
                group=group,
                uploaded_by=request.user,
                file_obj=serializer.validated_data["file"],
            )
        except ImportParserError as exc:
            return Response(
                {
                    "detail": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            ImportBatchSerializer(batch).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="issues")
    def issues(self, request, pk=None):
        """
        Returns all issues for an import batch.

        Endpoint:
        GET /api/imports/{batch_id}/issues/
        """

        batch = self.get_object()

        issues = (
            ImportIssue.objects
            .filter(batch=batch)
            .select_related("row", "reviewed_by")
            .order_by("severity", "row__row_number", "id")
        )

        return Response(
            ImportIssueSerializer(issues, many=True).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="summary")
    def summary(self, request, pk=None):
        """
        Lightweight summary for import report cards.
        """

        batch = self.get_object()

        return Response(
            {
                "id": batch.id,
                "filename": batch.original_filename,
                "status": batch.status,
                "summary": batch.summary,
            },
            status=status.HTTP_200_OK,
        )


class ImportIssueViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Import issue API.

    Supports:
    - list issues
    - view one issue
    - submit decision on one issue
    """

    serializer_class = ImportIssueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            ImportIssue.objects
            .filter(batch__group__memberships__user=self.request.user)
            .select_related("batch", "row", "reviewed_by")
            .order_by("-created_at")
            .distinct()
        )

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="decision")
    def decision(self, request, pk=None):
        """
        Records user's decision for one import issue.

        Endpoint:
        POST /api/imports/issues/{issue_id}/decision/

        Body:
        {
          "decision": "SKIP_ROW",
          "note": "Duplicate of row 3"
        }

        Important:
        This creates ImportDecision so Meera's approval requirement is traceable.
        """

        issue = self.get_object()
        batch = issue.batch

        if not user_is_group_admin(request.user, batch.group):
            raise PermissionDenied("Only group admins can review import issues.")

        serializer = ImportIssueDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        decision = serializer.validated_data["decision"]
        note = serializer.validated_data.get("note", "")

        before = {
            "issue_status": issue.status,
            "row_status": issue.row.status if issue.row else None,
        }

        if decision == "APPROVE":
            issue.status = ImportIssue.Status.APPROVED

        elif decision == "REJECT":
            issue.status = ImportIssue.Status.REJECTED

        elif decision == "SKIP_ROW":
            issue.status = ImportIssue.Status.APPROVED

            if issue.row:
                issue.row.status = ImportRow.Status.SKIPPED
                issue.row.save(update_fields=["status", "updated_at"])

        elif decision == "KEEP_ROW":
            issue.status = ImportIssue.Status.APPROVED

            if issue.row and issue.row.status != ImportRow.Status.BLOCKED:
                issue.row.status = ImportRow.Status.VALID
                issue.row.save(update_fields=["status", "updated_at"])

        elif decision == "IMPORT_AS_SETTLEMENT":
            issue.status = ImportIssue.Status.APPROVED

            if issue.row:
                issue.row.status = ImportRow.Status.NEEDS_REVIEW
                issue.row.save(update_fields=["status", "updated_at"])

        elif decision == "FIX_LATER":
            issue.status = ImportIssue.Status.OPEN

        issue.reviewed_by = request.user
        issue.reviewed_at = timezone.now()
        issue.resolution_note = note
        issue.save(
            update_fields=[
                "status",
                "reviewed_by",
                "reviewed_at",
                "resolution_note",
                "updated_at",
            ]
        )

        after = {
            "issue_status": issue.status,
            "row_status": issue.row.status if issue.row else None,
        }

        ImportDecision.objects.create(
            issue=issue,
            decided_by=request.user,
            decision=decision,
            before=before,
            after=after,
            note=note,
        )

        refresh_batch_summary(batch)

        return Response(
            ImportIssueSerializer(issue).data,
            status=status.HTTP_200_OK,
        )