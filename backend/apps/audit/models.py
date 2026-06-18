from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    """
    Stores important user actions in the system.

    Useful for:
    - import approvals
    - skipped duplicate rows
    - committed import batches
    - manually created expenses
    - recorded settlements

    It keeps financial changes traceable during review and debugging.
    """

    class Action(models.TextChoices):
        CREATE_GROUP = "CREATE_GROUP", "Create Group"
        UPDATE_GROUP = "UPDATE_GROUP", "Update Group"

        ADD_MEMBER = "ADD_MEMBER", "Add Member"
        UPDATE_MEMBERSHIP = "UPDATE_MEMBERSHIP", "Update Membership"
        REMOVE_MEMBER = "REMOVE_MEMBER", "Remove Member"

        CREATE_EXPENSE = "CREATE_EXPENSE", "Create Expense"
        UPDATE_EXPENSE = "UPDATE_EXPENSE", "Update Expense"
        DELETE_EXPENSE = "DELETE_EXPENSE", "Delete Expense"

        RECORD_SETTLEMENT = "RECORD_SETTLEMENT", "Record Settlement"

        UPLOAD_IMPORT = "UPLOAD_IMPORT", "Upload Import"
        REVIEW_IMPORT_ISSUE = "REVIEW_IMPORT_ISSUE", "Review Import Issue"
        COMMIT_IMPORT = "COMMIT_IMPORT", "Commit Import"

        AI_EXPLAIN_IMPORT = "AI_EXPLAIN_IMPORT", "AI Explain Import"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="audit_logs",
    )

    action = models.CharField(
        max_length=80,
        choices=Action.choices,
    )

    entity_type = models.CharField(
        max_length=80,
        help_text="Example: Expense, ImportIssue, ImportBatch, GroupMembership",
    )

    entity_id = models.CharField(
        max_length=80,
        blank=True,
        help_text="ID of the entity affected.",
    )

    before = models.JSONField(
        null=True,
        blank=True,
        help_text="State before the action.",
    )

    after = models.JSONField(
        null=True,
        blank=True,
        help_text="State after the action.",
    )

    note = models.TextField(
        blank=True,
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Extra context like request source, row number, issue code, etc.",
    )

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [
            models.Index(fields=["actor", "created_at"]),
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} by {self.actor} at {self.created_at}"