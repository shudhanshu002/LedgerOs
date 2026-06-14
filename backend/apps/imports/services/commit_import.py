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
    Finds a user by username, case-insensitive.
    """

    user = User.objects.filter(username__iexact=name).first()

    if not user:
        raise CommitImportError(f"Unknown user: {name}")

    return user


def user_is_active_on(group, user: User, expense_date) -> bool:
    """
    Final safety check before committing rows.

    Even if anomaly detection missed something, commit step should not
    create invalid financial data.
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
    A row cannot be committed if it has unresolved ERROR issues.
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
    Warning/info issues that imply user review must be approved before commit.

    This prevents silent decisions.
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
    Settlement-looking rows should become Settlement only when approved.
    """

    return issue_approved(row, "SETTLEMENT_AS_EXPENSE")


def row_should_be_skipped(row: ImportRow) -> bool:
    """
    Rows marked skipped through user decision should not be committed.
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


def validate_people_active(group, users: list[User], expense_date):
    for user in users:
        if not user_is_active_on(group, user, expense_date):
            raise CommitImportError(
                f"{user.username} was not active on {expense_date}."
            )


def commit_expense_row(row: ImportRow) -> Expense:
    """
    Converts one reviewed import row into Expense + ExpenseSplit rows.

    This is where CSV data starts affecting balances.
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
    Infers settlement paid_by and paid_to from normalized row.

    Example:
    paid_by = Rohan
    participants = [Rohan, Aisha]

    Then:
    paid_by = Rohan
    paid_to = Aisha

    If ambiguous, we block commit instead of guessing silently.
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
    Converts one approved settlement-like import row into Settlement.
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
    A row can be committed only if:
    - it is not skipped
    - it is not already committed
    - it has no unresolved ERROR issues
    - it has no open review-required issues
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
    Commits reviewed import rows into real financial records.

    Important:
    Uploading CSV only creates report data.
    This function is the explicit approval-to-ledger step.
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