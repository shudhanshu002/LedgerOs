from decimal import Decimal

from django.contrib.auth.models import User
from django.db import transaction
from django.utils.dateparse import parse_date

from apps.expenses.models import Expense, ExpenseSplit, Settlement
from apps.expenses.services.money import MoneyError, parse_decimal_amount, to_ledger_paise
from apps.expenses.services.split_calculator import (
    SplitCalculationError,
    calculate_split,
)
from apps.groups.models import GroupMembership
from apps.imports.models import ImportBatch, ImportIssue, ImportRow
from apps.imports.services.anomaly_detector import refresh_batch_summary


class CommitImportError(ValueError):
    pass


REVIEW_REQUIRED_CODES = {
    "NEGATIVE_AMOUNT",
    "AMOUNT_PRECISION",
    "AMBIGUOUS_DATE",
    "USD_CONVERTED",
    "SETTLEMENT_AS_EXPENSE",
    "DUPLICATE_EXACT",
    "POSSIBLE_DUPLICATE",
    "INACTIVE_MEMBER",
    "SPLIT_DETAILS_WITH_EQUAL",
}


def get_user_by_name(name: str) -> User:
    """
    Find a user by username, case-insensitively.
    """

    user = User.objects.filter(username__iexact=name).first()

    if not user:
        raise CommitImportError(f"Unknown user: {name}")

    return user


def user_is_active_on(group, user: User, expense_date) -> bool:
    """
    Check active membership on the date being committed.
    """

    return (
        GroupMembership.objects.filter(
            group=group,
            user=user,
            joined_at__lte=expense_date,
        )
        .filter(left_at__isnull=True)
        .exists()
        or GroupMembership.objects.filter(
            group=group,
            user=user,
            joined_at__lte=expense_date,
            left_at__gte=expense_date,
        ).exists()
    )


def row_has_unresolved_blocking_issues(row: ImportRow) -> bool:
    """
    Rows with open ERROR issues cannot be committed.
    """

    return (
        row.issues.filter(severity=ImportIssue.Severity.ERROR)
        .exclude(
            status__in=[
                ImportIssue.Status.APPROVED,
                ImportIssue.Status.RESOLVED,
            ]
        )
        .exists()
    )


def row_has_unapproved_review_issues(row: ImportRow) -> bool:
    """
    Review-required warnings and info issues need approval before commit.
    """

    return row.issues.filter(
        code__in=REVIEW_REQUIRED_CODES,
        status=ImportIssue.Status.OPEN,
    ).exists()


def issue_approved(row: ImportRow, code: str) -> bool:
    return row.issues.filter(
        code=code,
        status__in=[
            ImportIssue.Status.APPROVED,
            ImportIssue.Status.RESOLVED,
        ],
    ).exists()


def should_import_as_settlement(row: ImportRow) -> bool:
    """
    Return true when the reviewer approved settlement import.
    """

    return issue_approved(row, "SETTLEMENT_AS_EXPENSE")


def row_should_be_skipped(row: ImportRow) -> bool:
    """
    Skip rows that were deliberately removed during review.
    """

    return row.status == ImportRow.Status.SKIPPED


def get_expense_date(normalized: dict):
    expense_date = parse_date(normalized.get("date"))

    if not expense_date:
        raise CommitImportError("Cannot commit row with invalid date.")

    return expense_date


def get_amount_paise(normalized: dict) -> int:
    try:
        return to_ledger_paise(
            normalized.get("amount_raw"),
            normalized.get("currency", "INR"),
        )
    except MoneyError as exc:
        raise CommitImportError(str(exc)) from exc


def get_original_amount(normalized: dict) -> Decimal:
    try:
        return parse_decimal_amount(normalized.get("amount_raw"))
    except MoneyError as exc:
        raise CommitImportError(str(exc)) from exc


def validate_people_active(
    group,
    users: list[User],
    expense_date,
    *,
    allow_review_override: bool = False,
):
    for user in users:
        if not user_is_active_on(group, user, expense_date):
            if allow_review_override:
                continue

            raise CommitImportError(
                f"{user.username} was not active on {expense_date}."
            )


def commit_expense_row(row: ImportRow) -> Expense:
    """
    Convert one approved import row into an Expense and its splits.
    """

    normalized = row.normalized_data
    batch = row.batch
    group = batch.group

    expense_date = get_expense_date(normalized)
    amount_paise = get_amount_paise(normalized)
    original_amount = get_original_amount(normalized)

    if amount_paise <= 0:
        raise CommitImportError("Expense amount must be greater than zero.")

    payer = get_user_by_name(normalized.get("payer", ""))

    participant_names = normalized.get("participants", [])

    if not participant_names:
        raise CommitImportError("Expense requires at least one participant.")

    participants = [
        get_user_by_name(name)
        for name in participant_names
    ]

    validate_people_active(
        group,
        [payer] + participants,
        expense_date,
        allow_review_override=issue_approved(row, "INACTIVE_MEMBER"),
    )

    try:
        split_result = calculate_split(
            total_paise=amount_paise,
            split_type=normalized.get("split_type", "EQUAL"),
            participants=participant_names,
            split_values_raw=normalized.get("split_values_raw", ""),
        )
    except SplitCalculationError as exc:
        raise CommitImportError(str(exc)) from exc

    split_users = {
        name: get_user_by_name(name)
        for name in split_result.keys()
    }

    validate_people_active(
        group,
        list(split_users.values()),
        expense_date,
        allow_review_override=issue_approved(row, "INACTIVE_MEMBER"),
    )

    expense = Expense.objects.create(
        group=group,
        paid_by=payer,
        description=normalized.get("description", ""),
        category=normalized.get("category", ""),
        expense_date=expense_date,
        original_amount=original_amount,
        original_currency=normalized.get("currency", "INR"),
        amount_paise=amount_paise,
        split_type=normalized.get("split_type", "EQUAL"),
        source_import_row=row,
    )

    for name, owed_paise in split_result.items():
        ExpenseSplit.objects.create(
            expense=expense,
            user=split_users[name],
            owed_paise=owed_paise,
            raw_value=str(normalized.get("split_values_raw", "")),
        )

    row.status = ImportRow.Status.COMMITTED
    row.save(update_fields=["status", "updated_at"])

    return expense


def infer_settlement_parties(row: ImportRow) -> tuple[User, User]:
    """
    Infer settlement payer and receiver from the normalized row.
    """

    normalized = row.normalized_data

    paid_by = get_user_by_name(normalized.get("payer", ""))

    participants = [
        get_user_by_name(name)
        for name in normalized.get("participants", [])
    ]

    possible_receivers = [
        user
        for user in participants
        if user.id != paid_by.id
    ]

    if len(possible_receivers) != 1:
        raise CommitImportError(
            "Could not infer settlement receiver. Expected exactly one receiver."
        )

    return paid_by, possible_receivers[0]


def commit_settlement_row(row: ImportRow) -> Settlement:
    """
    Convert one approved settlement-like import row into a Settlement.
    """

    normalized = row.normalized_data
    batch = row.batch
    group = batch.group

    settlement_date = get_expense_date(normalized)
    amount_paise = get_amount_paise(normalized)

    if amount_paise <= 0:
        raise CommitImportError("Settlement amount must be greater than zero.")

    paid_by, paid_to = infer_settlement_parties(row)

    validate_people_active(
        group,
        [paid_by, paid_to],
        settlement_date,
        allow_review_override=issue_approved(row, "INACTIVE_MEMBER"),
    )

    settlement = Settlement.objects.create(
        group=group,
        paid_by=paid_by,
        paid_to=paid_to,
        amount_paise=amount_paise,
        settlement_date=settlement_date,
        note=normalized.get("description", ""),
        source_import_row=row,
    )

    row.status = ImportRow.Status.COMMITTED
    row.save(update_fields=["status", "updated_at"])

    return settlement


def can_commit_row(row: ImportRow) -> bool:
    """
    Check whether a reviewed row is eligible for commit.
    """

    if row.status in [
        ImportRow.Status.SKIPPED,
        ImportRow.Status.COMMITTED,
        ImportRow.Status.BLOCKED,
    ]:
        return False

    if row_has_unresolved_blocking_issues(row):
        return False

    if row_has_unapproved_review_issues(row):
        return False

    return True


@transaction.atomic
def commit_import_batch(batch: ImportBatch, committed_by: User) -> dict:
    """
    Commit eligible reviewed rows into expenses or settlements.
    """

    if batch.status == ImportBatch.Status.COMMITTED:
        raise CommitImportError("This import batch is already committed.")

    rows = (
        batch.rows
        .prefetch_related("issues")
        .order_by("row_number")
    )

    result = {
        "batch_id": batch.id,
        "committed_by": committed_by.id,
        "committed_expenses": 0,
        "committed_settlements": 0,
        "skipped_rows": 0,
        "blocked_rows": 0,
        "errors": [],
    }

    for row in rows:
        if row_should_be_skipped(row):
            result["skipped_rows"] += 1
            continue

        if not can_commit_row(row):
            result["blocked_rows"] += 1
            continue

        try:
            if should_import_as_settlement(row):
                commit_settlement_row(row)
                result["committed_settlements"] += 1
            else:
                commit_expense_row(row)
                result["committed_expenses"] += 1

        except CommitImportError as exc:
            result["errors"].append(
                {
                    "row_id": row.id,
                    "row_number": row.row_number,
                    "message": str(exc),
                }
            )

    refresh_batch_summary(batch)

    total_committed = (
        result["committed_expenses"]
        + result["committed_settlements"]
    )

    if result["errors"] or result["blocked_rows"]:
        batch.status = ImportBatch.Status.PARTIALLY_COMMITTED

    elif total_committed > 0:
        batch.status = ImportBatch.Status.COMMITTED

    batch.save(update_fields=["status", "updated_at"])

    result["batch_status"] = batch.status

    return result
