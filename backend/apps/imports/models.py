from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.groups.models import Group


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ImportBatch(TimeStampedModel):
    """
    Represents one CSV upload attempt.

    Example:
    User uploads expenses_export.csv.
    We create one ImportBatch for that upload.

    The batch does not immediately create expenses.
    First, we parse rows and create an import report.
    """

    class Status(models.TextChoices):
        PENDING_REVIEW = "PENDING_REVIEW", "Pending Review"
        PARTIALLY_COMMITTED = "PARTIALLY_COMMITTED", "Partially Committed"
        COMMITTED = "COMMITTED", "Committed"
        FAILED = "FAILED", "Failed"

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="import_batches",
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_import_batches",
    )

    original_filename = models.CharField(max_length=255)

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING_REVIEW,
    )

    total_rows = models.PositiveIntegerField(default=0)

    summary = models.JSONField(
        default=dict,
        blank=True,
        help_text="Small summary: counts by severity, valid rows, blocked rows.",
    )

    class Meta:
        indexes = [
            models.Index(fields=["group", "created_at"]),
            models.Index(fields=["uploaded_by", "created_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.original_filename} - {self.status}"


class ImportRow(TimeStampedModel):
    """
    Represents one row from the uploaded CSV.

    We keep both:
    - raw_data: exact row from CSV
    - normalized_data: cleaned/interpreted version

    This is important for live review because we can trace exactly
    what happened to each CSV row.
    """

    class Status(models.TextChoices):
        VALID = "VALID", "Valid"
        NEEDS_REVIEW = "NEEDS_REVIEW", "Needs Review"
        BLOCKED = "BLOCKED", "Blocked"
        SKIPPED = "SKIPPED", "Skipped"
        COMMITTED = "COMMITTED", "Committed"

    batch = models.ForeignKey(
        ImportBatch,
        on_delete=models.CASCADE,
        related_name="rows",
    )

    row_number = models.PositiveIntegerField(
        help_text="CSV row number. Header is row 1, data usually starts at row 2.",
    )

    raw_data = models.JSONField(
        default=dict,
        help_text="Original CSV row as dictionary.",
    )

    normalized_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Normalized row after cleaning date/name/currency/split fields.",
    )

    row_hash = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Hash of normalized row, used for exact duplicate detection.",
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.NEEDS_REVIEW,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["batch", "row_number"],
                name="unique_import_row_number_per_batch",
            )
        ]
        indexes = [
            models.Index(fields=["batch", "status"]),
            models.Index(fields=["batch", "row_hash"]),
        ]

    def __str__(self):
        return f"Batch {self.batch_id} Row {self.row_number}"


class ImportIssue(TimeStampedModel):
    """
    Represents one problem detected during import.

    Every CSV problem should become an ImportIssue.

    Assignment requirement:
    - detect the problem
    - surface it to the user
    - handle it according to a documented policy
    """

    class Severity(models.TextChoices):
        INFO = "INFO", "Info"
        WARNING = "WARNING", "Warning"
        ERROR = "ERROR", "Error"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        RESOLVED = "RESOLVED", "Resolved"

    batch = models.ForeignKey(
        ImportBatch,
        on_delete=models.CASCADE,
        related_name="issues",
    )

    row = models.ForeignKey(
        ImportRow,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="issues",
        help_text="Some batch-level issues may not belong to one specific row.",
    )

    code = models.CharField(
        max_length=80,
        help_text="Machine-readable anomaly code.",
    )

    severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
    )

    message = models.TextField(
        help_text="Human-readable explanation shown in import report.",
    )

    policy = models.TextField(
        blank=True,
        help_text="Documented policy used to handle this issue.",
    )

    suggested_action = models.CharField(
        max_length=120,
        blank=True,
        help_text="Example: Skip duplicate, Convert USD, Review manually.",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="reviewed_import_issues",
    )

    reviewed_at = models.DateTimeField(null=True, blank=True)

    resolution_note = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["batch", "severity"]),
            models.Index(fields=["batch", "status"]),
            models.Index(fields=["code"]),
        ]

    def __str__(self):
        return f"{self.code} - {self.severity}"


class ImportDecision(TimeStampedModel):
    """
    Stores user decisions made during import review.

    Example:
    - User approved skipping duplicate row.
    - User approved converting settlement row into Settlement.
    - User rejected a suggested fix.

    This gives Meera the approval trail she asked for.
    """

    issue = models.ForeignKey(
        ImportIssue,
        on_delete=models.CASCADE,
        related_name="decisions",
    )

    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="import_decisions",
    )

    decision = models.CharField(
        max_length=50,
        help_text="APPROVE, REJECT, SKIP_ROW, IMPORT_AS_SETTLEMENT, etc.",
    )

    before = models.JSONField(
        null=True,
        blank=True,
        help_text="State before decision.",
    )

    after = models.JSONField(
        null=True,
        blank=True,
        help_text="State after decision.",
    )

    note = models.TextField(blank=True)

    def __str__(self):
        return f"{self.decision} on issue {self.issue_id}"