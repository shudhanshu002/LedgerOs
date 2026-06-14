from collections import defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation

from django.contrib.auth.models import User
from django.db.models import Q

from apps.expenses.services.money import MoneyError, to_ledger_paise
from apps.expenses.services.split_calculator import (
    SplitCalculationError,
    parse_named_values,
)
from apps.groups.models import Group, GroupMembership
from apps.imports.models import ImportBatch, ImportIssue, ImportRow


ISSUE_POLICIES = {
    "INVALID_DATE": "Block the row. The importer does not guess dates silently.",
    "MISSING_PAYER": "Block the row until the payer is selected.",
    "UNKNOWN_MEMBER": "Block the row until the person is mapped to an existing member or created.",
    "INVALID_AMOUNT": "Block the row until the amount is corrected.",
    "NEGATIVE_AMOUNT": "Flag for review. Treat as refund only after user approval.",
    "ZERO_AMOUNT": "Block the row. Zero amount expenses do not affect balances.",
    "UNSUPPORTED_CURRENCY": "Block the row until currency is mapped to a supported currency.",
    "USD_CONVERTED": "Convert USD to INR using the documented USD_TO_INR_RATE policy.",
    "SETTLEMENT_AS_EXPENSE": "Do not import as expense. Import as settlement after approval.",
    "DUPLICATE_EXACT": "Do not silently delete. User must approve skip or keep.",
    "DUPLICATE_CONFLICT": "Do not choose winner automatically. User must choose the correct row.",
    "INACTIVE_MEMBER": "Flag participant/payer if they were not active on the expense date.",
    "INVALID_SPLIT_TYPE": "Block row until split type is supported or mapped.",
    "INVALID_PERCENTAGE_TOTAL": "Block row. Percentage split must total 100.",
    "INVALID_EXACT_TOTAL": "Block row. Exact split values must equal expense amount.",
    "INVALID_SHARE_VALUE": "Block row. Share values must be positive.",
    "MISSING_PARTICIPANTS": "Block row. Expense must have at least one participant.",
    "EMPTY_DESCRIPTION": "Warn user. Description is important for traceability.",
}


SUPPORTED_CURRENCIES = {"INR", "USD"}

SUPPORTED_SPLIT_TYPES = {"EQUAL", "EXACT", "PERCENTAGE", "SHARE"}


def create_issue(
    *,
    batch: ImportBatch,
    row: ImportRow | None,
    code: str,
    severity: str,
    message: str,
    suggested_action: str,
) -> ImportIssue:
    """
    Creates one ImportIssue.

    Every anomaly should go through this function so policies stay consistent.
    """

    return ImportIssue.objects.create(
        batch=batch,
        row=row,
        code=code,
        severity=severity,
        message=message,
        policy=ISSUE_POLICIES.get(code, ""),
        suggested_action=suggested_action,
    )


def parse_decimal_or_none(value):
    try:
        cleaned = (
            str(value)
            .strip()
            .replace("₹", "")
            .replace("$", "")
            .replace(",", "")
        )

        if cleaned == "":
            return None

        return Decimal(cleaned)

    except (InvalidOperation, ValueError):
        return None


def parse_iso_date_or_none(value):
    if not value:
        return None

    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def looks_like_settlement(normalized: dict) -> bool:
    """
    Detects rows that are probably settlements/payments, not expenses.

    Example:
    "Meera paid back Rohan"
    "UPI settlement"
    "payment to Rohan"
    """

    searchable_text = " ".join(
        [
            normalized.get("description", ""),
            normalized.get("category", ""),
            normalized.get("notes", ""),
        ]
    ).lower()

    keywords = [
        "settlement",
        "settle",
        "paid back",
        "pay back",
        "payment",
        "repaid",
        "repay",
        "upi",
        "transfer",
        "sent to",
        "gave back",
    ]

    return any(keyword in searchable_text for keyword in keywords)


def get_known_users_by_name(names: set[str]) -> dict[str, User]:
    """
    Returns users by username lowercase.

    Normalizer already turns 'priya' into 'Priya',
    but this lookup stays case-safe.
    """

    return {
        user.username.lower(): user
        for user in User.objects.filter(username__in=list(names))
    }


def is_user_active_on(group: Group, user: User, expense_date: date) -> bool:
    """
    Checks if a user was active in the group on a specific date.

    This is the rule that protects Sam from March expenses
    and Meera from April expenses.
    """

    return GroupMembership.objects.filter(
        group=group,
        user=user,
        joined_at__lte=expense_date,
    ).filter(
        Q(left_at__isnull=True) | Q(left_at__gte=expense_date)
    ).exists()


def validate_split_totals(
    *,
    batch: ImportBatch,
    row: ImportRow,
    normalized: dict,
    amount_decimal: Decimal,
):
    """
    Detects split-level anomalies.

    Supported:
    - percentage total must be 100
    - exact split total must equal expense total
    - share values must be positive
    """

    split_type = normalized.get("split_type")
    split_values_raw = normalized.get("split_values_raw", "")
    currency = normalized.get("currency", "INR")

    if split_type == "EQUAL":
        return

    try:
        named_values = parse_named_values(split_values_raw)
    except SplitCalculationError as exc:
        create_issue(
            batch=batch,
            row=row,
            code="INVALID_SPLIT_TYPE",
            severity=ImportIssue.Severity.ERROR,
            message=str(exc),
            suggested_action="Fix split values",
        )
        return

    if not named_values:
        create_issue(
            batch=batch,
            row=row,
            code="INVALID_SPLIT_TYPE",
            severity=ImportIssue.Severity.ERROR,
            message=f"{split_type} split requires split_values.",
            suggested_action="Add split values",
        )
        return

    if split_type == "PERCENTAGE":
        percentage_total = sum(named_values.values())

        if percentage_total != Decimal("100"):
            create_issue(
                batch=batch,
                row=row,
                code="INVALID_PERCENTAGE_TOTAL",
                severity=ImportIssue.Severity.ERROR,
                message=f"Percentage split totals {percentage_total}, not 100.",
                suggested_action="Fix percentages",
            )

    elif split_type == "EXACT":
        try:
            expense_total_paise = to_ledger_paise(amount_decimal, currency)
            split_total_paise = sum(
                to_ledger_paise(value, currency)
                for value in named_values.values()
            )
        except MoneyError as exc:
            create_issue(
                batch=batch,
                row=row,
                code="INVALID_AMOUNT",
                severity=ImportIssue.Severity.ERROR,
                message=str(exc),
                suggested_action="Fix amount",
            )
            return

        if split_total_paise != expense_total_paise:
            create_issue(
                batch=batch,
                row=row,
                code="INVALID_EXACT_TOTAL",
                severity=ImportIssue.Severity.ERROR,
                message=(
                    f"Exact split total {split_total_paise} paise does not "
                    f"match expense total {expense_total_paise} paise."
                ),
                suggested_action="Fix exact split",
            )

    elif split_type == "SHARE":
        for name, share_value in named_values.items():
            if share_value <= 0:
                create_issue(
                    batch=batch,
                    row=row,
                    code="INVALID_SHARE_VALUE",
                    severity=ImportIssue.Severity.ERROR,
                    message=f"Share value for {name} must be greater than zero.",
                    suggested_action="Fix share values",
                )


def detect_row_anomalies(
    *,
    batch: ImportBatch,
    row: ImportRow,
    group: Group,
) -> list[ImportIssue]:
    """
    Detects anomalies for a single CSV row.

    This function should not crash on bad data.
    Bad data becomes ImportIssue.
    """

    before_ids = set(
        ImportIssue.objects.filter(batch=batch, row=row).values_list("id", flat=True)
    )

    normalized = row.normalized_data

    expense_date = parse_iso_date_or_none(normalized.get("date"))
    payer_name = normalized.get("payer", "")
    participants = normalized.get("participants", [])
    amount_raw = normalized.get("amount_raw", "")
    currency = normalized.get("currency", "INR")
    split_type = normalized.get("split_type", "EQUAL")
    description = normalized.get("description", "")

    if not expense_date:
        create_issue(
            batch=batch,
            row=row,
            code="INVALID_DATE",
            severity=ImportIssue.Severity.ERROR,
            message=f"Could not parse date: {normalized.get('date_raw')}",
            suggested_action="Fix date",
        )

    if not description:
        create_issue(
            batch=batch,
            row=row,
            code="EMPTY_DESCRIPTION",
            severity=ImportIssue.Severity.WARNING,
            message="Description is empty.",
            suggested_action="Add description",
        )

    if not payer_name:
        create_issue(
            batch=batch,
            row=row,
            code="MISSING_PAYER",
            severity=ImportIssue.Severity.ERROR,
            message="Payer is missing.",
            suggested_action="Select payer",
        )

    if not participants:
        create_issue(
            batch=batch,
            row=row,
            code="MISSING_PARTICIPANTS",
            severity=ImportIssue.Severity.ERROR,
            message="No participants found for this expense.",
            suggested_action="Add participants",
        )

    amount_decimal = parse_decimal_or_none(amount_raw)

    if amount_decimal is None:
        create_issue(
            batch=batch,
            row=row,
            code="INVALID_AMOUNT",
            severity=ImportIssue.Severity.ERROR,
            message=f"Invalid amount: {amount_raw}",
            suggested_action="Fix amount",
        )

    elif amount_decimal < 0:
        create_issue(
            batch=batch,
            row=row,
            code="NEGATIVE_AMOUNT",
            severity=ImportIssue.Severity.WARNING,
            message=f"Negative amount detected: {amount_raw}.",
            suggested_action="Approve as refund or block row",
        )

    elif amount_decimal == 0:
        create_issue(
            batch=batch,
            row=row,
            code="ZERO_AMOUNT",
            severity=ImportIssue.Severity.ERROR,
            message="Zero amount detected.",
            suggested_action="Skip or fix row",
        )

    if currency not in SUPPORTED_CURRENCIES:
        create_issue(
            batch=batch,
            row=row,
            code="UNSUPPORTED_CURRENCY",
            severity=ImportIssue.Severity.ERROR,
            message=f"Unsupported currency: {currency}.",
            suggested_action="Map currency",
        )

    elif currency == "USD":
        create_issue(
            batch=batch,
            row=row,
            code="USD_CONVERTED",
            severity=ImportIssue.Severity.INFO,
            message="USD amount will be converted to INR using fixed configured rate.",
            suggested_action="Convert using USD_TO_INR_RATE",
        )

    if split_type not in SUPPORTED_SPLIT_TYPES:
        create_issue(
            batch=batch,
            row=row,
            code="INVALID_SPLIT_TYPE",
            severity=ImportIssue.Severity.ERROR,
            message=f"Unsupported split type: {split_type}.",
            suggested_action="Map split type",
        )

    if looks_like_settlement(normalized):
        create_issue(
            batch=batch,
            row=row,
            code="SETTLEMENT_AS_EXPENSE",
            severity=ImportIssue.Severity.WARNING,
            message="This row looks like a settlement/payment, not an expense.",
            suggested_action="Import as settlement after approval",
        )

    all_names = set(participants)

    if payer_name:
        all_names.add(payer_name)

    users_by_name = get_known_users_by_name(all_names)

    for name in all_names:
        if name.lower() not in users_by_name:
            create_issue(
                batch=batch,
                row=row,
                code="UNKNOWN_MEMBER",
                severity=ImportIssue.Severity.ERROR,
                message=f"Unknown member: {name}.",
                suggested_action="Map or create member",
            )

    if expense_date:
        for name in all_names:
            user = users_by_name.get(name.lower())

            if not user:
                continue

            if not is_user_active_on(group, user, expense_date):
                create_issue(
                    batch=batch,
                    row=row,
                    code="INACTIVE_MEMBER",
                    severity=ImportIssue.Severity.WARNING,
                    message=f"{name} was not an active member on {expense_date}.",
                    suggested_action="Review participant/payer",
                )

    if amount_decimal is not None and amount_decimal > 0 and split_type in SUPPORTED_SPLIT_TYPES:
        validate_split_totals(
            batch=batch,
            row=row,
            normalized=normalized,
            amount_decimal=amount_decimal,
        )

    after_issues = ImportIssue.objects.filter(batch=batch, row=row).exclude(
        id__in=before_ids
    )

    return list(after_issues)


def detect_batch_anomalies(batch: ImportBatch):
    """
    Detects batch-level anomalies like duplicates and conflicts.

    Runs after all rows are normalized and saved.
    """

    rows = list(batch.rows.all())

    detect_exact_duplicates(batch, rows)
    detect_duplicate_conflicts(batch, rows)


def detect_exact_duplicates(batch: ImportBatch, rows: list[ImportRow]):
    """
    Detects exact duplicates using row_hash.

    Example:
    Same groceries row appears twice.
    """

    rows_by_hash = defaultdict(list)

    for row in rows:
        rows_by_hash[row.row_hash].append(row)

    for duplicate_rows in rows_by_hash.values():
        if len(duplicate_rows) <= 1:
            continue

        original = duplicate_rows[0]

        for duplicate in duplicate_rows[1:]:
            create_issue(
                batch=batch,
                row=duplicate,
                code="DUPLICATE_EXACT",
                severity=ImportIssue.Severity.WARNING,
                message=(
                    f"Row {duplicate.row_number} appears to be an exact duplicate "
                    f"of row {original.row_number}."
                ),
                suggested_action="Approve skip duplicate or keep intentionally",
            )


def duplicate_conflict_signature(row: ImportRow):
    """
    Signature for detecting duplicate-like conflicts.

    Same:
    - date
    - description
    - payer
    - participants

    But different:
    - amount

    Example:
    Two people logged same dinner with different amount.
    """

    normalized = row.normalized_data

    return (
        normalized.get("date"),
        normalized.get("description", "").lower(),
        normalized.get("payer", "").lower(),
        tuple(sorted(name.lower() for name in normalized.get("participants", []))),
    )


def detect_duplicate_conflicts(batch: ImportBatch, rows: list[ImportRow]):
    grouped_rows = defaultdict(list)

    for row in rows:
        grouped_rows[duplicate_conflict_signature(row)].append(row)

    for same_signature_rows in grouped_rows.values():
        if len(same_signature_rows) <= 1:
            continue

        amounts = {
            row.normalized_data.get("amount_raw")
            for row in same_signature_rows
        }

        if len(amounts) <= 1:
            continue

        row_numbers = ", ".join(
            str(row.row_number)
            for row in same_signature_rows
        )

        for row in same_signature_rows:
            create_issue(
                batch=batch,
                row=row,
                code="DUPLICATE_CONFLICT",
                severity=ImportIssue.Severity.ERROR,
                message=(
                    f"Rows {row_numbers} look like the same expense but have "
                    f"different amounts: {', '.join(sorted(amounts))}."
                ),
                suggested_action="Choose correct row manually",
            )


def update_row_status_from_issues(row: ImportRow):
    """
    Updates ImportRow.status based on its issues.
    """

    issues = row.issues.all()

    if issues.filter(severity=ImportIssue.Severity.ERROR).exists():
        row.status = ImportRow.Status.BLOCKED

    elif issues.exists():
        row.status = ImportRow.Status.NEEDS_REVIEW

    else:
        row.status = ImportRow.Status.VALID

    row.save(update_fields=["status", "updated_at"])


def refresh_batch_summary(batch: ImportBatch):
    """
    Stores summary counts on ImportBatch.

    This makes import report page fast and easy to display.
    """

    rows = batch.rows.all()
    issues = batch.issues.all()

    summary = {
        "total_rows": rows.count(),
        "valid_rows": rows.filter(status=ImportRow.Status.VALID).count(),
        "needs_review_rows": rows.filter(status=ImportRow.Status.NEEDS_REVIEW).count(),
        "blocked_rows": rows.filter(status=ImportRow.Status.BLOCKED).count(),
        "issues": {
            "info": issues.filter(severity=ImportIssue.Severity.INFO).count(),
            "warning": issues.filter(severity=ImportIssue.Severity.WARNING).count(),
            "error": issues.filter(severity=ImportIssue.Severity.ERROR).count(),
        },
    }

    batch.total_rows = summary["total_rows"]
    batch.summary = summary
    batch.save(update_fields=["total_rows", "summary", "updated_at"])