from django.contrib import admin

from apps.expenses.models import Expense, ExpenseSplit, Settlement


class ExpenseSplitInline(admin.TabularInline):
    """
    Shows split rows inside Expense admin page.

    This helps trace:
    - who owed what
    - how an expense affected each person's balance
    """

    model = ExpenseSplit
    extra = 0
    readonly_fields = [
        "created_at",
        "updated_at",
    ]


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    """
    Admin view for expenses.

    Useful during testing and review and debugging because each expense
    shows its payer, amount, currency, split type, and split rows.
    """

    list_display = [
        "id",
        "description",
        "group",
        "paid_by",
        "expense_date",
        "original_amount",
        "original_currency",
        "amount_paise",
        "split_type",
        "source_import_row",
        "created_at",
    ]

    search_fields = [
        "description",
        "category",
        "paid_by__username",
        "group__name",
    ]

    list_filter = [
        "original_currency",
        "split_type",
        "expense_date",
        "created_at",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
    ]

    inlines = [
        ExpenseSplitInline,
    ]


@admin.register(ExpenseSplit)
class ExpenseSplitAdmin(admin.ModelAdmin):
    """
    Admin view for expense split rows.

    Useful when checking expense and settlement flows:
    "No magic numbers. Show exactly which expenses make up my balance."
    """

    list_display = [
        "id",
        "expense",
        "user",
        "owed_paise",
        "raw_value",
        "created_at",
    ]

    search_fields = [
        "expense__description",
        "user__username",
        "user__email",
    ]

    list_filter = [
        "created_at",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
    ]


@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    """
    Admin view for settlements/payments.

    This helps verify that settlement rows from CSV are not treated as expenses.
    """

    list_display = [
        "id",
        "group",
        "paid_by",
        "paid_to",
        "amount_paise",
        "settlement_date",
        "source_import_row",
        "created_at",
    ]

    search_fields = [
        "paid_by__username",
        "paid_to__username",
        "group__name",
        "note",
    ]

    list_filter = [
        "settlement_date",
        "created_at",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
    ]