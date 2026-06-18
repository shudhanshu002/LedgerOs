from django.contrib import admin

from apps.imports.models import (
    ImportBatch,
    ImportDecision,
    ImportIssue,
    ImportRow,
)


class ImportRowInline(admin.TabularInline):
    """
    Shows CSV rows inside ImportBatch admin.

    Useful for quickly checking:
    - row number
    - normalized data
    - row status
    """

    model = ImportRow
    extra = 0
    fields = [
        "row_number",
        "status",
        "row_hash",
        "raw_data",
        "normalized_data",
    ]
    readonly_fields = [
        "row_number",
        "status",
        "row_hash",
        "raw_data",
        "normalized_data",
        "created_at",
        "updated_at",
    ]
    can_delete = False


class ImportIssueInline(admin.TabularInline):
    """
    Shows detected anomalies inside ImportBatch admin.
    """

    model = ImportIssue
    extra = 0
    fields = [
        "row",
        "code",
        "severity",
        "message",
        "suggested_action",
        "status",
    ]
    readonly_fields = [
        "row",
        "code",
        "severity",
        "message",
        "policy",
        "suggested_action",
        "status",
        "created_at",
        "updated_at",
    ]
    can_delete = False


@admin.register(ImportBatch)
class ImportBatchAdmin(admin.ModelAdmin):
    """
    Admin view for one CSV import attempt.

    This helps verify:
    - uploaded file
    - total rows
    - summary
    - rows created
    - issues detected
    """

    list_display = [
        "id",
        "original_filename",
        "group",
        "uploaded_by",
        "status",
        "total_rows",
        "created_at",
    ]

    search_fields = [
        "original_filename",
        "group__name",
        "uploaded_by__username",
        "uploaded_by__email",
    ]

    list_filter = [
        "status",
        "created_at",
    ]

    readonly_fields = [
        "summary",
        "created_at",
        "updated_at",
    ]

    inlines = [
        ImportIssueInline,
        ImportRowInline,
    ]


@admin.register(ImportRow)
class ImportRowAdmin(admin.ModelAdmin):
    """
    Admin view for each CSV row.

    Worth keeping for review and debugging:
    interviewer can ask about one CSV row and we can trace what happened.
    """

    list_display = [
        "id",
        "batch",
        "row_number",
        "status",
        "row_hash",
        "created_at",
    ]

    search_fields = [
        "row_hash",
        "raw_data",
        "normalized_data",
    ]

    list_filter = [
        "status",
        "created_at",
    ]

    readonly_fields = [
        "batch",
        "row_number",
        "raw_data",
        "normalized_data",
        "row_hash",
        "created_at",
        "updated_at",
    ]


@admin.register(ImportIssue)
class ImportIssueAdmin(admin.ModelAdmin):
    """
    Admin view for detected CSV problems.

    Every deliberate CSV problem should appear here.
    """

    list_display = [
        "id",
        "batch",
        "row",
        "code",
        "severity",
        "status",
        "suggested_action",
        "reviewed_by",
        "reviewed_at",
        "created_at",
    ]

    search_fields = [
        "code",
        "message",
        "policy",
        "suggested_action",
        "row__row_number",
    ]

    list_filter = [
        "code",
        "severity",
        "status",
        "created_at",
    ]

    readonly_fields = [
        "batch",
        "row",
        "code",
        "severity",
        "message",
        "policy",
        "suggested_action",
        "created_at",
        "updated_at",
    ]


@admin.register(ImportDecision)
class ImportDecisionAdmin(admin.ModelAdmin):
    """
    Admin view for user decisions on import issues.

    This keeps approval history easy to inspect.
    """

    list_display = [
        "id",
        "issue",
        "decision",
        "decided_by",
        "created_at",
    ]

    search_fields = [
        "decision",
        "note",
        "issue__code",
        "decided_by__username",
    ]

    list_filter = [
        "decision",
        "created_at",
    ]

    readonly_fields = [
        "issue",
        "decided_by",
        "decision",
        "before",
        "after",
        "note",
        "created_at",
        "updated_at",
    ]