from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.expenses.models import Expense, ExpenseSplit, Settlement
from apps.expenses.serializers import (
    ExpenseSerializer,
    ManualExpenseCreateSerializer,
    SettlementSerializer,
)
from apps.expenses.services.balance_calculator import calculate_group_balances
from apps.expenses.services.money import MoneyError, paise_to_rupees, to_ledger_paise
from apps.expenses.services.split_calculator import (
    SplitCalculationError,
    calculate_split,
)
from apps.groups.models import Group, GroupMembership


def user_belongs_to_group(user, group_id: int) -> bool:
    """
    Checks whether the logged-in user has access to this group.
    """

    return GroupMembership.objects.filter(
        group_id=group_id,
        user=user,
    ).exists()


def get_group_or_404_for_user(user, group_id: int) -> Group:
    """
    Returns group only if user belongs to it.
    """

    try:
        return Group.objects.get(
            id=group_id,
            memberships__user=user,
        )
    except Group.DoesNotExist as exc:
        raise ValidationError("Group not found or you do not have access.") from exc


def get_active_memberships_by_user_id(group: Group, expense_date):
    """
    Returns active memberships for a specific date.

    This is the core reason Sam does not owe March expenses.
    """

    memberships = GroupMembership.objects.filter(
        group=group,
        joined_at__lte=expense_date,
    ).filter(
        left_at__isnull=True
    ) | GroupMembership.objects.filter(
        group=group,
        joined_at__lte=expense_date,
        left_at__gte=expense_date,
    )

    return {
        membership.user_id: membership
        for membership in memberships.select_related("user")
    }


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    Expense API.

    Supports:
    - list expenses
    - read expense details
    - manually create expenses
    - calculate balances for a group
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Expense.objects
            .filter(group__memberships__user=self.request.user)
            .select_related("group", "paid_by")
            .prefetch_related("splits__user")
            .distinct()
            .order_by("-expense_date", "-id")
        )

    def get_serializer_class(self):
        if self.action == "create":
            return ManualExpenseCreateSerializer

        return ExpenseSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Manually creates an expense.

        Important:
        Frontend sends business-level data.
        Backend calculates:
        - INR paise
        - split amounts
        - member validity by date
        """

        serializer = ManualExpenseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        group = get_group_or_404_for_user(
            request.user,
            data["group"],
        )

        paid_by = User.objects.filter(id=data["paid_by"]).first()

        if not paid_by:
            raise ValidationError({"paid_by": "Payer not found."})

        if not GroupMembership.objects.filter(group=group, user=paid_by).exists():
            raise ValidationError({"paid_by": "Payer is not a member of this group."})

        active_memberships = get_active_memberships_by_user_id(
            group,
            data["expense_date"],
        )

        if paid_by.id not in active_memberships:
            raise ValidationError(
                {
                    "paid_by": (
                        "Payer was not an active group member "
                        "on the expense date."
                    )
                }
            )

        participants = User.objects.filter(id__in=data["participants"])

        if participants.count() != len(set(data["participants"])):
            raise ValidationError(
                {
                    "participants": "One or more participants were not found."
                }
            )

        for participant in participants:
            if participant.id not in active_memberships:
                raise ValidationError(
                    {
                        "participants": (
                            f"{participant.username} was not an active group member "
                            f"on {data['expense_date']}."
                        )
                    }
                )

        participant_names = [
            participant.username
            for participant in participants
        ]

        try:
            amount_paise = to_ledger_paise(
                data["original_amount"],
                data["original_currency"],
            )
        except MoneyError as exc:
            raise ValidationError({"original_amount": str(exc)}) from exc

        try:
            split_result = calculate_split(
                total_paise=amount_paise,
                split_type=data["split_type"],
                participants=participant_names,
                split_values_raw=data.get("split_values_raw", ""),
            )
        except SplitCalculationError as exc:
            raise ValidationError({"split": str(exc)}) from exc

        users_by_username = {
            user.username: user
            for user in User.objects.filter(username__in=split_result.keys())
        }

        missing_names = set(split_result.keys()) - set(users_by_username.keys())

        if missing_names:
            raise ValidationError(
                {
                    "split_values_raw": (
                        f"Unknown split participants: {', '.join(missing_names)}"
                    )
                }
            )

        expense = Expense.objects.create(
            group=group,
            paid_by=paid_by,
            description=data["description"],
            category=data.get("category", ""),
            expense_date=data["expense_date"],
            original_amount=data["original_amount"],
            original_currency=data["original_currency"],
            amount_paise=amount_paise,
            split_type=data["split_type"],
        )

        for username, owed_paise in split_result.items():
            ExpenseSplit.objects.create(
                expense=expense,
                user=users_by_username[username],
                owed_paise=owed_paise,
                raw_value=str(owed_paise),
            )

        return Response(
            ExpenseSerializer(expense).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="groups/(?P<group_id>[^/.]+)/balances")
    def group_balances(self, request, group_id=None):
        """
        Returns group balances and suggested settlements.

        Endpoint:
        GET /api/expenses/groups/{group_id}/balances/
        """

        group = get_group_or_404_for_user(request.user, group_id)

        result = calculate_group_balances(group.id)

        balances = []

        for person, amount_paise in result["balances"].items():
            balances.append(
                {
                    "person": person,
                    "balance_paise": amount_paise,
                    "balance_rupees": str(paise_to_rupees(amount_paise)),
                }
            )

        suggested_settlements = []

        for settlement in result["suggested_settlements"]:
            suggested_settlements.append(
                {
                    **settlement,
                    "amount_rupees": str(
                        paise_to_rupees(settlement["amount_paise"])
                    ),
                }
            )

        return Response(
            {
                "group_id": group.id,
                "group_name": group.name,
                "balances": balances,
                "breakdown": result["breakdown"],
                "suggested_settlements": suggested_settlements,
            }
        )


class SettlementViewSet(viewsets.ModelViewSet):
    """
    Settlement/payment API.

    Used when one member pays back another member.

    Example:
    Meera paid Rohan ₹2300.
    """

    serializer_class = SettlementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Settlement.objects
            .filter(group__memberships__user=self.request.user)
            .select_related("group", "paid_by", "paid_to")
            .distinct()
            .order_by("-settlement_date", "-id")
        )

    def perform_create(self, serializer):
        group = serializer.validated_data["group"]

        if not user_belongs_to_group(self.request.user, group.id):
            raise PermissionDenied("You do not have access to this group.")

        paid_by = serializer.validated_data["paid_by"]
        paid_to = serializer.validated_data["paid_to"]

        for user in [paid_by, paid_to]:
            if not GroupMembership.objects.filter(group=group, user=user).exists():
                raise ValidationError(
                    f"{user.username} is not a member of this group."
                )

        serializer.save()