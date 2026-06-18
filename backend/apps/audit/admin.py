from django.contrib import admin

from apps.audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """
    Admin view for audit logs.

    Audit logs are useful during testing/review and debugging because they show:
    - who uploaded a CSV
    - who approved/rejected an import issue
    - who skipped a duplicate row
    - who committed an import batch
    - who manually created an expense
    - who recorded a settlement
    """

    list_display = [
        "id",
        "actor",
        "action",
        "entity_type",
        "entity_id",
        "created_at",
    ]

    search_fields = [
        "actor__username",
        "actor__email",
        "action",
        "entity_type",
        "entity_id",
        "note",
    ]

    list_filter = [
        "action",
        "entity_type",
        "created_at",
    ]

    readonly_fields = [
        "actor",
        "action",
        "entity_type",
        "entity_id",
        "before",
        "after",
        "note",
        "metadata",
        "created_at",
    ]

    ordering = [
        "-created_at",
    ]

    def has_add_permission(self, request):
        """
        Audit logs should be created by business actions, not manually.
        """

        return False

    def has_change_permission(self, request, obj=None):
        """
        Audit logs should be append-only.
        """

        return False

    def has_delete_permission(self, request, obj=None):
        """
        Audit logs should not be deleted from admin.
        """

        return False