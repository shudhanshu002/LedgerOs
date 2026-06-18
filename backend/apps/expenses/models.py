from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.groups.models import Group


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Expense(TimeStampedModel):
    """
    One shared expense paid by a group member.

    Paybacks are stored as Settlement records, not expenses.
    """

    class Currency(models.TextChoices):
        INR = "INR", "INR"
        USD = "USD", "USD"

    class SplitType(models.TextChoices):
        EQUAL = "EQUAL", "Equal"
        EXACT = "EXACT", "Exact"
        PERCENTAGE = "PERCENTAGE", "Percentage"
        SHARE = "SHARE", "Share"

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="expenses",
    )

    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="expenses_paid",
    )

    description = models.CharField(max_length=255)

    category = models.CharField(
        max_length=80,
        blank=True,
    )

    expense_date = models.DateField()

    original_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        help_text="Amount exactly as entered/imported in original currency.",
    )

    original_currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.INR,
    )

    amount_paise = models.BigIntegerField(
        help_text="Final ledger amount in INR paise.",
    )

    split_type = models.CharField(
        max_length=20,
        choices=SplitType.choices,
    )

    source_import_row = models.ForeignKey(
        "imports.ImportRow",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_expenses",
    )

    class Meta:
        indexes = [
            models.Index(fields=["group", "expense_date"]),
            models.Index(fields=["group", "paid_by"]),
            models.Index(fields=["source_import_row"]),
        ]

    def __str__(self):
        return f"{self.description} - {self.amount_paise} paise"


class ExpenseSplit(TimeStampedModel):
    """
    The amount one member owes for an expense.
    """

    expense = models.ForeignKey(
        Expense,
        on_delete=models.CASCADE,
        related_name="splits",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="expense_splits",
    )

    owed_paise = models.BigIntegerField(
        help_text="Amount this user owes for this expense in INR paise.",
    )

    raw_value = models.CharField(
        max_length=100,
        blank=True,
        help_text="Original split value from CSV, useful for traceability.",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["expense", "user"],
                name="unique_expense_split_per_user",
            )
        ]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["expense"]),
        ]

    def __str__(self):
        return f"{self.user.username} owes {self.owed_paise} paise"


class Settlement(TimeStampedModel):
    """
    A direct payback between two members.

    Settlements change balances without creating new shared spending.
    """

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="settlements",
    )

    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="settlements_paid",
    )

    paid_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="settlements_received",
    )

    amount_paise = models.BigIntegerField(
        help_text="Settlement amount in INR paise.",
    )

    settlement_date = models.DateField()

    note = models.CharField(
        max_length=255,
        blank=True,
    )

    source_import_row = models.ForeignKey(
        "imports.ImportRow",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_settlements",
    )

    class Meta:
        indexes = [
            models.Index(fields=["group", "settlement_date"]),
            models.Index(fields=["paid_by", "paid_to"]),
            models.Index(fields=["source_import_row"]),
        ]

    def __str__(self):
        return f"{self.paid_by.username} paid {self.paid_to.username} {self.amount_paise} paise"