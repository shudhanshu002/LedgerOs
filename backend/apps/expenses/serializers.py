from django.contrib.auth.models import User
from rest_framework import serializers

from apps.expenses.models import Expense, ExpenseSplit, Settlement
from apps.expenses.services.money import paise_to_rupees


class UserMiniSerializer(serializers.ModelSerializer):
    """
    Small safe user object for API responses.
    """

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
        ]


class ExpenseSplitSerializer(serializers.ModelSerializer):
    """
    Read serializer for individual expense splits.

    This helps Rohan's requirement:
    "Show exactly which expenses make up my balance."
    """

    user_detail = UserMiniSerializer(source="user", read_only=True)
    owed_rupees = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseSplit
        fields = [
            "id",
            "expense",
            "user",
            "user_detail",
            "owed_paise",
            "owed_rupees",
            "raw_value",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "expense",
            "created_at",
        ]

    def get_owed_rupees(self, obj):
        return str(paise_to_rupees(obj.owed_paise))


class ExpenseSerializer(serializers.ModelSerializer):
    """
    Read serializer for expenses.

    Includes:
    - payer detail
    - original amount/currency
    - ledger INR paise
    - split breakdown
    """

    paid_by_detail = UserMiniSerializer(source="paid_by", read_only=True)
    amount_rupees = serializers.SerializerMethodField()
    source_import_row_number = serializers.SerializerMethodField()
    splits = ExpenseSplitSerializer(many=True, read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "group",
            "paid_by",
            "paid_by_detail",
            "description",
            "category",
            "expense_date",
            "original_amount",
            "original_currency",
            "amount_paise",
            "amount_rupees",
            "split_type",
            "splits",
            "source_import_row",
            "source_import_row_number",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "amount_paise",
            "source_import_row",
            "created_at",
            "updated_at",
        ]

    def get_amount_rupees(self, obj):
        return str(paise_to_rupees(obj.amount_paise))

    def get_source_import_row_number(self, obj):
        return obj.source_import_row.row_number if obj.source_import_row else None


class ManualExpenseCreateSerializer(serializers.Serializer):
    """
    Input serializer for manually creating an expense.

    We do not accept amount_paise directly from frontend.
    Backend calculates amount_paise using the money service.

    This prevents frontend/client bugs from corrupting financial data.
    """

    group = serializers.IntegerField()
    paid_by = serializers.IntegerField()

    description = serializers.CharField(max_length=255)
    category = serializers.CharField(max_length=80, required=False, allow_blank=True)

    expense_date = serializers.DateField()

    original_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    original_currency = serializers.ChoiceField(
        choices=Expense.Currency.choices,
        default=Expense.Currency.INR,
    )

    split_type = serializers.ChoiceField(
        choices=Expense.SplitType.choices,
    )

    participants = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text="List of user IDs included in this split.",
    )

    split_values_raw = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Required for EXACT, PERCENTAGE, and SHARE split types.",
    )

    def validate_description(self, value):
        value = value.strip()

        if len(value) < 2:
            raise serializers.ValidationError(
                "Description must be at least 2 characters."
            )

        return value

    def validate(self, attrs):
        split_type = attrs.get("split_type")
        split_values_raw = attrs.get("split_values_raw", "")

        if split_type in ["EXACT", "PERCENTAGE", "SHARE"] and not split_values_raw:
            raise serializers.ValidationError(
                {
                    "split_values_raw": (
                        "split_values_raw is required for EXACT, "
                        "PERCENTAGE, and SHARE splits."
                    )
                }
            )

        return attrs


class SettlementSerializer(serializers.ModelSerializer):
    """
    Serializer for recorded payments/settlements.

    Example:
    Meera paid Rohan ₹2300.
    """

    paid_by_detail = UserMiniSerializer(source="paid_by", read_only=True)
    paid_to_detail = UserMiniSerializer(source="paid_to", read_only=True)
    amount_rupees = serializers.SerializerMethodField()

    class Meta:
        model = Settlement
        fields = [
            "id",
            "group",
            "paid_by",
            "paid_by_detail",
            "paid_to",
            "paid_to_detail",
            "amount_paise",
            "amount_rupees",
            "settlement_date",
            "note",
            "source_import_row",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "source_import_row",
            "created_at",
            "updated_at",
        ]

    def get_amount_rupees(self, obj):
        return str(paise_to_rupees(obj.amount_paise))

    def validate(self, attrs):
        paid_by = attrs.get("paid_by")
        paid_to = attrs.get("paid_to")
        amount_paise = attrs.get("amount_paise")

        if paid_by and paid_to and paid_by == paid_to:
            raise serializers.ValidationError(
                "paid_by and paid_to cannot be the same person."
            )

        if amount_paise is not None and amount_paise <= 0:
            raise serializers.ValidationError(
                {
                    "amount_paise": "Settlement amount must be greater than zero."
                }
            )

        return attrs


class BalanceLineSerializer(serializers.Serializer):
    """
    Used for API documentation/shape clarity.

    We may not directly use this everywhere, but it describes one balance line.
    """

    person = serializers.CharField()
    balance_paise = serializers.IntegerField()
    balance_rupees = serializers.CharField()


class SuggestedSettlementSerializer(serializers.Serializer):
    """
    Serializer shape for simplified settlement suggestions.

    Example:
    Rohan pays Aisha ₹250.
    """

    from_person = serializers.CharField(source="from")
    to = serializers.CharField()
    amount_paise = serializers.IntegerField()
    amount_rupees = serializers.CharField(required=False)
