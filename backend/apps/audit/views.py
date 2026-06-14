from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only audit log API.

    We expose audit logs so admins can see:
    - who uploaded CSV
    - who reviewed import issues
    - who skipped duplicate rows
    - who committed import batches
    - who created expenses/settlements

    Important:
    This API is read-only.
    Audit logs should not be edited from frontend.
    """

    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Users can only see audit logs related to entities they can access.

        For now we return logs created by the current user.

        Later, we can expand this to group-level audit visibility:
        group admins see all audit logs for their group.
        """

        return (
            AuditLog.objects
            .filter(actor=self.request.user)
            .select_related("actor")
            .order_by("-created_at")
        )