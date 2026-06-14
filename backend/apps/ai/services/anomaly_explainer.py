from collections import Counter, defaultdict

from apps.imports.models import ImportBatch, ImportIssue
from apps.imports.filename_display import humanize_filename


ISSUE_EXPLANATIONS = {
    "INVALID_DATE": {
        "meaning": "The date could not be parsed safely.",
        "risk": "If the app guesses the date, the expense may affect the wrong membership period.",
        "recommended_action": "Fix the date manually before importing.",
    },
    "AMBIGUOUS_DATE": {
        "meaning": "The date can be interpreted in more than one way.",
        "risk": "For example, 04/05/2026 could mean 4 May or 5 April.",
        "recommended_action": "Ask the user to confirm the exact date.",
    },
    "MISSING_PAYER": {
        "meaning": "The row does not say who paid.",
        "risk": "Balances cannot be calculated without knowing who paid.",
        "recommended_action": "Select the payer manually.",
    },
    "UNKNOWN_MEMBER": {
        "meaning": "The row contains a person who is not found in the app users.",
        "risk": "The app cannot safely assign debt to an unknown person.",
        "recommended_action": "Map the name to an existing user or create the user first.",
    },
    "INACTIVE_MEMBER": {
        "meaning": "A payer or participant was not active in the group on the expense date.",
        "risk": "This could incorrectly charge someone before joining or after leaving.",
        "recommended_action": "Review membership timeline before approving.",
    },
    "INVALID_AMOUNT": {
        "meaning": "The amount is missing or not a valid number.",
        "risk": "The app cannot calculate balances from invalid money data.",
        "recommended_action": "Correct the amount manually.",
    },
    "AMOUNT_PRECISION": {
        "meaning": "The amount has more than two decimal places.",
        "risk": "Money is stored in paise, so rounding must be explicit.",
        "recommended_action": "Approve rounding or fix the amount.",
    },
    "NEGATIVE_AMOUNT": {
        "meaning": "The amount is negative.",
        "risk": "Negative values may represent refunds, but they should not be treated as normal expenses silently.",
        "recommended_action": "Approve as refund only if that is the intended meaning.",
    },
    "ZERO_AMOUNT": {
        "meaning": "The amount is zero.",
        "risk": "Zero amount expenses do not affect balances and usually indicate bad data.",
        "recommended_action": "Skip the row or correct the amount.",
    },
    "MISSING_CURRENCY": {
        "meaning": "The currency column is empty.",
        "risk": "The app should not assume INR silently because that can corrupt balances.",
        "recommended_action": "Select the correct currency before import.",
    },
    "UNSUPPORTED_CURRENCY": {
        "meaning": "The currency is not supported by the app.",
        "risk": "Unsupported currency cannot be converted into the INR ledger safely.",
        "recommended_action": "Map the currency or reject the row.",
    },
    "USD_CONVERTED": {
        "meaning": "The row is in USD and will be converted to INR.",
        "risk": "Foreign exchange conversion changes the ledger amount.",
        "recommended_action": "Approve conversion using the configured USD_TO_INR_RATE.",
    },
    "SETTLEMENT_AS_EXPENSE": {
        "meaning": "The row looks like a settlement/payment, not a shared expense.",
        "risk": "If imported as an expense, it will increase debt instead of reducing debt.",
        "recommended_action": "Import it as a settlement after review.",
    },
    "DUPLICATE_EXACT": {
        "meaning": "This row appears to be an exact duplicate of another row.",
        "risk": "Importing both will double-count the same expense.",
        "recommended_action": "Skip the duplicate unless it is intentionally repeated.",
    },
    "DUPLICATE_CONFLICT": {
        "meaning": "Two rows look like the same expense but contain conflicting values.",
        "risk": "The app cannot decide which amount is correct automatically.",
        "recommended_action": "Choose the correct row manually.",
    },
    "POSSIBLE_DUPLICATE": {
        "meaning": "Two rows look similar but are not exact duplicates.",
        "risk": "They may be the same real-world expense written differently.",
        "recommended_action": "Review both rows before committing.",
    },
    "INVALID_SPLIT_TYPE": {
        "meaning": "The split type is missing or unsupported.",
        "risk": "The app cannot calculate how much each person owes.",
        "recommended_action": "Fix or map the split type.",
    },
    "SPLIT_DETAILS_WITH_EQUAL": {
        "meaning": "The row says equal split but also contains split details.",
        "risk": "The app should not guess whether to use equal split or the provided details.",
        "recommended_action": "Either clear split details or change the split type.",
    },
    "INVALID_PERCENTAGE_TOTAL": {
        "meaning": "Percentage split values do not total 100.",
        "risk": "The full expense amount would not be allocated correctly.",
        "recommended_action": "Fix the percentages.",
    },
    "INVALID_EXACT_TOTAL": {
        "meaning": "Exact split values do not match the expense amount.",
        "risk": "The split would create missing or extra money in balances.",
        "recommended_action": "Fix exact split amounts.",
    },
    "INVALID_SHARE_VALUE": {
        "meaning": "One or more share values are invalid.",
        "risk": "Share split requires positive share values.",
        "recommended_action": "Fix share values.",
    },
    "MISSING_PARTICIPANTS": {
        "meaning": "No split participants were found.",
        "risk": "The app cannot assign owed amounts.",
        "recommended_action": "Add participants.",
    },
    "EMPTY_DESCRIPTION": {
        "meaning": "The row has no useful description.",
        "risk": "Users cannot easily trace why they owe money.",
        "recommended_action": "Add or confirm the description.",
    },
}


def group_issues_by_code(issues) -> dict:
    grouped = defaultdict(list)

    for issue in issues:
        grouped[issue.code].append(issue)

    return grouped


def group_issues_by_severity(issues) -> dict:
    counter = Counter(issue.severity for issue in issues)

    return {
        "info": counter.get(ImportIssue.Severity.INFO, 0),
        "warning": counter.get(ImportIssue.Severity.WARNING, 0),
        "error": counter.get(ImportIssue.Severity.ERROR, 0),
    }


def build_issue_samples(issues, limit: int = 3) -> list[dict]:
    """
    Returns a few row examples for the explanation.

    We intentionally do not return every row here because the UI/report
    should stay readable.
    """

    samples = []

    for issue in issues[:limit]:
        samples.append(
            {
                "row_number": issue.row.row_number if issue.row else None,
                "message": issue.message,
                "suggested_action": issue.suggested_action,
                "status": issue.status,
            }
        )

    return samples


def explain_issue_code(code: str, issues: list[ImportIssue]) -> dict:
    explanation = ISSUE_EXPLANATIONS.get(
        code,
        {
            "meaning": "This issue was detected by the import validator.",
            "risk": "The row may affect balances incorrectly if imported without review.",
            "recommended_action": "Review this issue manually.",
        },
    )

    status_counts = Counter(issue.status for issue in issues)
    ordered_issues = sorted(
        issues,
        key=lambda issue: (
            issue.status != ImportIssue.Status.OPEN,
            issue.row.row_number if issue.row else 999999,
        ),
    )

    return {
        "code": code,
        "count": len(issues),
        "open_count": status_counts.get(ImportIssue.Status.OPEN, 0),
        "approved_count": status_counts.get(ImportIssue.Status.APPROVED, 0),
        "resolved_count": status_counts.get(ImportIssue.Status.RESOLVED, 0),
        "rejected_count": status_counts.get(ImportIssue.Status.REJECTED, 0),
        "severity": issues[0].severity if issues else None,
        "meaning": explanation["meaning"],
        "risk": explanation["risk"],
        "recommended_action": explanation["recommended_action"],
        "samples": build_issue_samples(ordered_issues),
    }


def build_summary_sentence(
    batch: ImportBatch,
    severity_counts: dict,
    open_severity_counts: dict,
    total_issues: int,
) -> str:
    """
    Builds one human-readable summary sentence.
    """

    total_rows = batch.total_rows
    error_count = severity_counts.get("error", 0)
    warning_count = severity_counts.get("warning", 0)
    info_count = severity_counts.get("info", 0)
    open_error_count = open_severity_counts.get("error", 0)
    open_warning_count = open_severity_counts.get("warning", 0)
    open_info_count = open_severity_counts.get("info", 0)
    open_total = open_error_count + open_warning_count + open_info_count

    if total_issues == 0:
        return (
            f"This CSV has {total_rows} rows and no detected issues. "
            "It is ready to commit."
        )

    return (
        f"This CSV has {total_rows} rows and {total_issues} detected issues: "
        f"{error_count} errors, {warning_count} warnings, and {info_count} info items. "
        f"Current open review work is {open_total} issues: "
        f"{open_error_count} errors, {open_warning_count} warnings, and "
        f"{open_info_count} info items. "
        "Only open issues still require action; approved or committed rows are kept for audit."
    )


def build_commit_guidance(open_severity_counts: dict, row_counts: dict) -> list[str]:
    guidance = []

    valid_rows = row_counts.get("valid_rows", 0)
    blocked_rows = row_counts.get("blocked_rows", 0)
    needs_review_rows = row_counts.get("needs_review_rows", 0)

    if open_severity_counts.get("error", 0) > 0:
        guidance.append(
            "Open error-level issues remain. Fix, skip, or reject those rows before they can enter the ledger."
        )

    if open_severity_counts.get("warning", 0) > 0:
        guidance.append(
            "Open warning-level issues still need an operator decision because they may change balances or membership responsibility."
        )

    if open_severity_counts.get("info", 0) > 0:
        guidance.append(
            "Open info-level issues document assumptions such as USD conversion; approve or skip them before committing those rows."
        )

    if valid_rows > 0:
        guidance.append(
            f"{valid_rows} row(s) are valid and can be committed now."
        )
    elif needs_review_rows or blocked_rows:
        guidance.append(
            "No valid rows are ready right now. Resolve the remaining review or blocked rows first."
        )

    if not guidance:
        guidance.append(
            "No review issues are open. The batch can be committed."
        )

    return guidance


def build_human_summary(batch: ImportBatch) -> dict:
    """
    Builds an AI-style import explanation.

    Important:
    This is deterministic and does not call an external LLM.
    That keeps the project reliable for demo and testing.
    """

    issues = list(
        batch.issues
        .select_related("row", "reviewed_by")
        .order_by("severity", "code", "row__row_number")
    )

    grouped_by_code = group_issues_by_code(issues)
    severity_counts = group_issues_by_severity(issues)
    open_issues = [
        issue
        for issue in issues
        if issue.status == ImportIssue.Status.OPEN
    ]
    open_severity_counts = group_issues_by_severity(open_issues)
    status_counts = Counter(issue.status for issue in issues)
    row_counts = batch.summary or {}

    issue_explanations = [
        explain_issue_code(code, issue_group)
        for code, issue_group in sorted(grouped_by_code.items())
    ]

    return {
        "batch_id": batch.id,
        "filename": batch.original_filename,
        "display_filename": humanize_filename(batch.original_filename),
        "batch_status": batch.status,
        "total_rows": batch.total_rows,
        "total_issues": len(issues),
        "severity_counts": severity_counts,
        "open_issue_count": len(open_issues),
        "open_severity_counts": open_severity_counts,
        "issue_status_counts": {
            "open": status_counts.get(ImportIssue.Status.OPEN, 0),
            "approved": status_counts.get(ImportIssue.Status.APPROVED, 0),
            "resolved": status_counts.get(ImportIssue.Status.RESOLVED, 0),
            "rejected": status_counts.get(ImportIssue.Status.REJECTED, 0),
        },
        "row_counts": {
            "valid_rows": row_counts.get("valid_rows", 0),
            "needs_review_rows": row_counts.get("needs_review_rows", 0),
            "blocked_rows": row_counts.get("blocked_rows", 0),
            "committed_rows": row_counts.get("committed_rows", 0),
            "skipped_rows": row_counts.get("skipped_rows", 0),
        },
        "summary": build_summary_sentence(
            batch=batch,
            severity_counts=severity_counts,
            open_severity_counts=open_severity_counts,
            total_issues=len(issues),
        ),
        "commit_guidance": build_commit_guidance(open_severity_counts, row_counts),
        "issue_explanations": issue_explanations,
    }
