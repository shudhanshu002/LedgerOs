from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditLog
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
from apps.imports.services.commit_import import CommitImportError, commit_import_batch
from apps.imports.services.parser import ImportParserError, create_import_batch_from_csv


def get_group_for_user(user, group_id: int) -> Group:
    """
    Returns group only if the logged-in user currently belongs to it.
    """

    today = timezone.localdate()

    try:
        return (
            Group.objects.filter(
                id=group_id,
                memberships__user=user,
                memberships__joined_at__lte=today,
            )
            .filter(
                Q(memberships__left_at__isnull=True)
                | Q(memberships__left_at__gte=today)
            )
            .distinct()
            .get()
        )

    except Group.DoesNotExist as exc:
        raise ValidationError(
            "Group not found or you do not have access."
        ) from exc


def user_is_group_admin(group: Group, user) -> bool:
    """
    Only group admins should approve import issues or commit import batches.
    """

    today = timezone.localdate()

    return (
        GroupMembership.objects.filter(
            group=group,
            user=user,
            role=GroupMembership.Role.ADMIN,
            joined_at__lte=today,
        )
        .filter(Q(left_at__isnull=True) | Q(left_at__gte=today))
        .exists()
    )


def create_import_audit_log(
    *,
    actor,
    action: str,
    entity_type: str,
    entity_id: str,
    before=None,
    after=None,
    note: str = "",
    metadata=None,
):
    """
    Small local audit helper.

    We keep import actions traceable:
    - CSV upload
    - issue review
    - batch commit
    """

    AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        before=before or {},
        after=after or {},
        note=note,
        metadata=metadata or {},
    )


def snapshot_issue(issue: ImportIssue) -> dict:
    """
    Stores important issue fields before/after decision.
    """

    return {
        "id": issue.id,
        "batch_id": issue.batch_id,
        "row_id": issue.row_id,
        "row_number": issue.row.row_number if issue.row else None,
        "code": issue.code,
        "severity": issue.severity,
        "status": issue.status,
        "message": issue.message,
        "suggested_action": issue.suggested_action,
        "reviewed_by_id": issue.reviewed_by_id,
        "reviewed_at": issue.reviewed_at.isoformat() if issue.reviewed_at else None,
        "resolution_note": issue.resolution_note,
    }


def recalculate_row_status_after_review(row: ImportRow | None):
    """
    Updates row status after user decision.

    Important:
    The first anomaly detector marks rows as BLOCKED/NEEDS_REVIEW.
    After a user approves or resolves issues, row status must be recalculated
    so commit_import.py can process it.
    """

    if row is None:
        return

    if row.status in [
        ImportRow.Status.SKIPPED,
        ImportRow.Status.COMMITTED,
    ]:
        return

    unresolved_errors = (
        row.issues.filter(severity=ImportIssue.Severity.ERROR)
        .exclude(
            status__in=[
                ImportIssue.Status.APPROVED,
                ImportIssue.Status.RESOLVED,
            ]
        )
        .exists()
    )

    if unresolved_errors:
        row.status = ImportRow.Status.BLOCKED

    elif row.issues.filter(status=ImportIssue.Status.OPEN).exists():
        row.status = ImportRow.Status.NEEDS_REVIEW

    else:
        row.status = ImportRow.Status.VALID

    row.save(update_fields=["status", "updated_at"])


def apply_import_decision(
    *,
    issue: ImportIssue,
    decision: str,
    reviewer,
    note: str,
):
    """
    Applies one decision to one import issue.

    Decision behavior:

    APPROVE:
        Approve this issue and allow row to move forward if no other open issue exists.

    KEEP_ROW:
        Used for duplicate-like rows where user confirms the row is intentional.

    SKIP_ROW:
        Skip the entire CSV row.

    IMPORT_AS_SETTLEMENT:
        Approve settlement-like row so commit step creates Settlement, not Expense.

    REJECT:
        Reject this row from import and skip it.

    FIX_LATER:
        Keep issue open.
    """

    row = issue.row
    decision = decision.upper()

    issue.reviewed_by = reviewer
    issue.reviewed_at = timezone.now()
    issue.resolution_note = note

    if decision == "APPROVE":
        issue.status = ImportIssue.Status.APPROVED

    elif decision == "KEEP_ROW":
        issue.status = ImportIssue.Status.APPROVED

    elif decision == "SKIP_ROW":
        issue.status = ImportIssue.Status.RESOLVED

        if row:
            row.status = ImportRow.Status.SKIPPED
            row.save(update_fields=["status", "updated_at"])

    elif decision == "IMPORT_AS_SETTLEMENT":
        if issue.code != "SETTLEMENT_AS_EXPENSE":
            raise ValidationError(
                "IMPORT_AS_SETTLEMENT can only be used for SETTLEMENT_AS_EXPENSE issues."
            )

        issue.status = ImportIssue.Status.APPROVED

    elif decision == "REJECT":
        issue.status = ImportIssue.Status.REJECTED

        if row:
            row.status = ImportRow.Status.SKIPPED
            row.save(update_fields=["status", "updated_at"])

    elif decision == "FIX_LATER":
        issue.status = ImportIssue.Status.OPEN

    else:
        raise ValidationError(f"Unsupported decision: {decision}")

    issue.save(
        update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "resolution_note",
            "updated_at",
        ]
    )

    recalculate_row_status_after_review(row)


class ImportBatchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API for CSV import batches.

    Main endpoints:

    POST /api/imports/upload/
    GET  /api/imports/
    GET  /api/imports/{id}/
    GET  /api/imports/{id}/issues/
    GET  /api/imports/{id}/summary/
    POST /api/imports/{id}/commit/
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            ImportBatch.objects.filter(
                group__memberships__user=self.request.user,
            )
            .select_related("group", "uploaded_by")
            .prefetch_related("rows", "issues")
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
        parser_classes=[MultiPartParser],
        url_path="upload",
    )
    def upload(self, request):
        """
        Uploads CSV and creates an import report.

        Important:
        This endpoint does NOT create expenses.
        It only creates:
        - ImportBatch
        - ImportRow
        - ImportIssue
        """

        serializer = ImportUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group = get_group_for_user(
            request.user,
            serializer.validated_data["group_id"],
        )

        uploaded_file = serializer.validated_data["file"]

        try:
            batch = create_import_batch_from_csv(
                group=group,
                uploaded_by=request.user,
                file_obj=uploaded_file,
            )

        except ImportParserError as exc:
            raise ValidationError(str(exc)) from exc

        create_import_audit_log(
            actor=request.user,
            action=AuditLog.Action.UPLOAD_IMPORT,
            entity_type="ImportBatch",
            entity_id=batch.id,
            after={
                "batch_id": batch.id,
                "group_id": group.id,
                "filename": batch.original_filename,
                "total_rows": batch.total_rows,
                "summary": batch.summary,
            },
            note="CSV import uploaded and analyzed.",
            metadata={
                "group_id": group.id,
                "filename": batch.original_filename,
            },
        )

        response_serializer = ImportBatchSerializer(batch)

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="issues")
    def issues(self, request, pk=None):
        """
        Returns all issues for one import batch.
        """

        batch = self.get_object()

        issues = (
            batch.issues
            .select_related("row", "reviewed_by")
            .order_by("severity", "code", "row__row_number")
        )

        serializer = ImportIssueSerializer(issues, many=True)

        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="summary")
    def summary(self, request, pk=None):
        """
        Returns compact import summary.
        """

        batch = self.get_object()
        refresh_batch_summary(batch)

        return Response(
            {
                "batch_id": batch.id,
                "status": batch.status,
                "total_rows": batch.total_rows,
                "summary": batch.summary,
            }
        )

    @action(detail=True, methods=["post"], url_path="commit")
    def commit(self, request, pk=None):
        """
        Commits reviewed import rows into actual expenses/settlements.

        Only group admin can commit.
        """

        batch = self.get_object()

        if not user_is_group_admin(batch.group, request.user):
            raise PermissionDenied(
                "Only group admins can commit an import batch."
            )

        try:
            result = commit_import_batch(
                batch=batch,
                committed_by=request.user,
            )

        except CommitImportError as exc:
            raise ValidationError(str(exc)) from exc

        create_import_audit_log(
            actor=request.user,
            action=AuditLog.Action.COMMIT_IMPORT,
            entity_type="ImportBatch",
            entity_id=batch.id,
            after=result,
            note="Import batch committed.",
            metadata={
                "group_id": batch.group_id,
                "batch_id": batch.id,
            },
        )

        return Response(result, status=status.HTTP_200_OK)


class ImportIssueViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API for reviewing import issues.

    Main endpoint:

    POST /api/imports/issues/{id}/decision/
    """

    serializer_class = ImportIssueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            ImportIssue.objects.filter(
                batch__group__memberships__user=self.request.user,
            )
            .select_related(
                "batch",
                "batch__group",
                "row",
                "reviewed_by",
            )
            .distinct()
            .order_by("severity", "code", "row__row_number")
        )

    @action(detail=True, methods=["post"], url_path="decision")
    def decision(self, request, pk=None):
        """
        Applies review decision to an import issue.

        Example body:

        {
          "decision": "APPROVE",
          "note": "Approved USD conversion"
        }
        """

        serializer = ImportIssueDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        decision_value = serializer.validated_data["decision"]
        note = serializer.validated_data.get("note", "")

        with transaction.atomic():
            issue = (
                ImportIssue.objects.select_for_update()
                .select_related("batch", "batch__group", "row")
                .get(id=self.get_object().id)
            )

            batch = issue.batch

            if not user_is_group_admin(batch.group, request.user):
                raise PermissionDenied(
                    "Only group admins can review import issues."
                )

            before = snapshot_issue(issue)

            apply_import_decision(
                issue=issue,
                decision=decision_value,
                reviewer=request.user,
                note=note,
            )

            issue.refresh_from_db()
            after = snapshot_issue(issue)

            ImportDecision.objects.create(
                issue=issue,
                decided_by=request.user,
                decision=decision_value,
                before=before,
                after=after,
                note=note,
            )

            refresh_batch_summary(batch)

            create_import_audit_log(
                actor=request.user,
                action=AuditLog.Action.REVIEW_IMPORT_ISSUE,
                entity_type="ImportIssue",
                entity_id=issue.id,
                before=before,
                after=after,
                note=note,
                metadata={
                    "decision": decision_value,
                    "batch_id": batch.id,
                    "row_id": issue.row_id,
                    "issue_code": issue.code,
                },
            )

        response_serializer = ImportIssueSerializer(issue)

        return Response(
            {
                "message": "Import decision applied successfully.",
                "decision": decision_value,
                "issue": response_serializer.data,
                "row_status": issue.row.status if issue.row else None,
                "batch_summary": issue.batch.summary,
            },
            status=status.HTTP_200_OK,
        )