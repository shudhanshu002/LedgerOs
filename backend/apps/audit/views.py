from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer
from apps.groups.models import GroupMembership
from apps.imports.models import ImportBatch, ImportIssue


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only audit log API.

    We expose audit logs so admins can see:
    - who uploaded CSV
    - who reviewed import issues
    - who skipped duplicate rows
    - who committed import batches
    - who created expenses/settlements

    Note:
    This API is read-only.
    Audit logs should not be edited from frontend.
    """

    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Users can see audit evidence for groups they can access, even if
        another admin performed the action. Worth keeping for review and debugging:
        Anita/Aisha should both be able to inspect how a group import changed.
        """

        group_ids = list(
            GroupMembership.objects.filter(user=self.request.user)
            .values_list("group_id", flat=True)
            .distinct()
        )

        batch_ids = list(
            ImportBatch.objects.filter(group_id__in=group_ids)
            .values_list("id", flat=True)
        )

        issue_ids = list(
            ImportIssue.objects.filter(batch_id__in=batch_ids)
            .values_list("id", flat=True)
        )

        return (
            AuditLog.objects
            .filter(
                Q(actor=self.request.user)
                | Q(metadata__group_id__in=group_ids)
                | Q(entity_type="ImportBatch", entity_id__in=[str(id) for id in batch_ids])
                | Q(entity_type="ImportIssue", entity_id__in=[str(id) for id in issue_ids])
            )
            .select_related("actor")
            .distinct()
            .order_by("-created_at")
        )
