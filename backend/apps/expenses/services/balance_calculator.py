from collections import defaultdict

from apps.expenses.models import Expense, Settlement


def calculate_group_balances(group_id: int) -> dict:
    """
    Calculate group balances in paise.

    Positive balances should receive money. Negative balances owe money.

    Formula:
    balance = total_paid_for_expenses
              - total_owed_for_expense_splits
              - settlements_received
              + settlements_paid

    Received settlements reduce a person's remaining receivable.
    """

    balances = defaultdict(int)
    breakdown = defaultdict(list)

    expenses = (
        Expense.objects
        .filter(group_id=group_id)
        .select_related("paid_by")
        .prefetch_related("splits__user")
        .order_by("expense_date", "id")
    )

    for expense in expenses:
        payer_name = expense.paid_by.username

        balances[payer_name] += expense.amount_paise

        breakdown[payer_name].append(
            {
                "type": "EXPENSE_PAID",
                "expense_id": expense.id,
                "date": expense.expense_date.isoformat(),
                "description": expense.description,
                "amount_paise": expense.amount_paise,
                "explanation": f"{payer_name} paid for {expense.description}",
            }
        )

        for split in expense.splits.all():
            member_name = split.user.username

            balances[member_name] -= split.owed_paise

            breakdown[member_name].append(
                {
                    "type": "EXPENSE_SHARE_OWED",
                    "expense_id": expense.id,
                    "date": expense.expense_date.isoformat(),
                    "description": expense.description,
                    "amount_paise": -split.owed_paise,
                    "explanation": f"{member_name} owes share for {expense.description}",
                }
            )

    settlements = (
        Settlement.objects
        .filter(group_id=group_id)
        .select_related("paid_by", "paid_to")
        .order_by("settlement_date", "id")
    )

    for settlement in settlements:
        paid_by_name = settlement.paid_by.username
        paid_to_name = settlement.paid_to.username

        # Paying a settlement reduces the payer's debt.
        balances[paid_by_name] += settlement.amount_paise

        breakdown[paid_by_name].append(
            {
                "type": "SETTLEMENT_PAID",
                "settlement_id": settlement.id,
                "date": settlement.settlement_date.isoformat(),
                "description": settlement.note,
                "amount_paise": settlement.amount_paise,
                "explanation": f"{paid_by_name} paid settlement to {paid_to_name}",
            }
        )

        # Receiving a settlement reduces the receiver's receivable.
        balances[paid_to_name] -= settlement.amount_paise

        breakdown[paid_to_name].append(
            {
                "type": "SETTLEMENT_RECEIVED",
                "settlement_id": settlement.id,
                "date": settlement.settlement_date.isoformat(),
                "description": settlement.note,
                "amount_paise": -settlement.amount_paise,
                "explanation": f"{paid_to_name} received settlement from {paid_by_name}",
            }
        )

    simplified_settlements = simplify_debts(balances)

    return {
        "balances": dict(balances),
        "breakdown": dict(breakdown),
        "suggested_settlements": simplified_settlements,
    }


def simplify_debts(balances: dict) -> list[dict]:
    """
    Turn raw balances into simple "who pays whom" suggestions.
    """

    debtors = []
    creditors = []

    for person, amount in balances.items():
        if amount < 0:
            debtors.append(
                {
                    "person": person,
                    "amount_paise": abs(amount),
                }
            )

        elif amount > 0:
            creditors.append(
                {
                    "person": person,
                    "amount_paise": amount,
                }
            )

    debtors.sort(key=lambda item: item["amount_paise"], reverse=True)
    creditors.sort(key=lambda item: item["amount_paise"], reverse=True)

    settlements = []

    debtor_index = 0
    creditor_index = 0

    while debtor_index < len(debtors) and creditor_index < len(creditors):
        debtor = debtors[debtor_index]
        creditor = creditors[creditor_index]

        amount = min(
            debtor["amount_paise"],
            creditor["amount_paise"],
        )

        if amount > 0:
            settlements.append(
                {
                    "from": debtor["person"],
                    "to": creditor["person"],
                    "amount_paise": amount,
                }
            )

        debtor["amount_paise"] -= amount
        creditor["amount_paise"] -= amount

        if debtor["amount_paise"] == 0:
            debtor_index += 1

        if creditor["amount_paise"] == 0:
            creditor_index += 1

    return settlements