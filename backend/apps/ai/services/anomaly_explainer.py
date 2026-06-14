from collections import Counter, defaultdict

from apps.imports.models import ImportBatch, ImportIssue


def group_issues_by_code(issues):
    """
    Groups import issues by issue code.

    Example:
    {
      "DUPLICATE_EXACT": 2,
      "USD_CONVERTED": 3
    }
    """

    return Counter(issue.code for issue in issues)


def group_issues_by_severity(issues):
    """
    Groups import issues by severity.

    Example:
    {
      "INFO": 2,
      "WARNING": 5,
      "ERROR": 3
    }
    """

    return Counter(issue.severity for issue in issues)


def build_issue_samples(issues, limit_per_code=3):
    """
    Creates small samples per issue type.

    We do not send or expose the entire CSV unnecessarily.
    This keeps the explanation focused and safe.
    """

    samples = defaultdict(list)

    for issue in issues:
        if len(samples[issue.code]) >= limit_per_code:
            continue

        samples[issue.code].append(
            {
                "row_number": issue.row.row_number if issue.row else None,
                "message": issue.message,
                "suggested_action": issue.suggested_action,
            }
        )

    return dict(samples)


def explain_issue_code(code: str, count: int) -> str:
    """
    Deterministic explanation for one issue code.

    This gives us an AI-like explanation without depending on an external API.
    Later we can replace/enhance this with OpenAI/Gemini safely.
    """

    explanations = {
        "INVALID_DATE": (
            f"{count} row(s) have dates the importer could not parse. "
            "These rows are blocked because guessing dates could charge the wrong people."
        ),
        "MISSING_PAYER": (
            f"{count} row(s) are missing payer information. "
            "These rows are blocked because every expense must have a person who paid."
        ),
        "UNKNOWN_MEMBER": (
            f"{count} row(s) contain people who are not known group members. "
            "These need review so the user can map or create the member."
        ),
        "INVALID_AMOUNT": (
            f"{count} row(s) contain invalid amount values. "
            "These rows are blocked because money values must be numeric."
        ),
        "NEGATIVE_AMOUNT": (
            f"{count} row(s) contain negative amounts. "
            "These may be refunds, but the app does not assume that without approval."
        ),
        "ZERO_AMOUNT": (
            f"{count} row(s) contain zero amount. "
            "These are blocked because they do not affect balances and may indicate bad data."
        ),
        "UNSUPPORTED_CURRENCY": (
            f"{count} row(s) use unsupported currencies. "
            "Only documented currencies should enter the ledger."
        ),
        "USD_CONVERTED": (
            f"{count} row(s) are in USD. "
            "They will be converted into INR using the configured fixed exchange-rate policy."
        ),
        "SETTLEMENT_AS_EXPENSE": (
            f"{count} row(s) look like repayments or settlements, not actual expenses. "
            "They should be reviewed and imported as settlements if approved."
        ),
        "DUPLICATE_EXACT": (
            f"{count} row(s) look like exact duplicates. "
            "They are not silently deleted; a user must approve skipping or keeping them."
        ),
        "DUPLICATE_CONFLICT": (
            f"{count} row(s) look like the same expense but have conflicting amounts. "
            "The app does not choose a winner automatically."
        ),
        "INACTIVE_MEMBER": (
            f"{count} row(s) include a person who was not active on the expense date. "
            "This protects cases like Sam joining mid-April or Meera leaving after March."
        ),
        "INVALID_SPLIT_TYPE": (
            f"{count} row(s) use unsupported or malformed split information. "
            "These rows are blocked until the split can be understood."
        ),
        "INVALID_PERCENTAGE_TOTAL": (
            f"{count} row(s) have percentage splits that do not total 100%. "
            "These rows are blocked because the owed amounts would be wrong."
        ),
        "INVALID_EXACT_TOTAL": (
            f"{count} row(s) have exact split values that do not match the total expense amount. "
            "These rows are blocked until fixed."
        ),
        "INVALID_SHARE_VALUE": (
            f"{count} row(s) have invalid share values. "
            "Share values must be positive."
        ),
        "MISSING_PARTICIPANTS": (
            f"{count} row(s) have no participants. "
            "An expense cannot be split without participants."
        ),
        "EMPTY_DESCRIPTION": (
            f"{count} row(s) have empty descriptions. "
            "These are warnings because descriptions help users trace balances later."
        ),
    }

    return explanations.get(
        code,
        f"{count} row(s) have issue type {code}. These should be reviewed before committing.",
    )


def build_human_summary(batch: ImportBatch) -> dict:
    """
    Builds a deterministic import explanation.

    Important:
    This is intentionally not used for financial calculations.
    It only explains already-detected ImportIssue records.
    """

    issues = list(
        ImportIssue.objects
        .filter(batch=batch)
        .select_related("row")
        .order_by("severity", "code", "row__row_number")
    )

    by_code = group_issues_by_code(issues)
    by_severity = group_issues_by_severity(issues)
    samples = build_issue_samples(issues)

    explanation_lines = []

    if not issues:
        explanation_lines.append(
            "No anomalies were detected in this import batch."
        )
    else:
        explanation_lines.append(
            f"This import found {len(issues)} issue(s) across {batch.total_rows} CSV row(s)."
        )

        error_count = by_severity.get(ImportIssue.Severity.ERROR, 0)
        warning_count = by_severity.get(ImportIssue.Severity.WARNING, 0)
        info_count = by_severity.get(ImportIssue.Severity.INFO, 0)

        explanation_lines.append(
            f"There are {error_count} error(s), {warning_count} warning(s), and {info_count} info item(s)."
        )

        if error_count:
            explanation_lines.append(
                "Rows with unresolved errors are blocked from being committed."
            )

        if warning_count:
            explanation_lines.append(
                "Rows with warnings need user review before they should affect balances."
            )

        if info_count:
            explanation_lines.append(
                "Info items document deliberate transformations such as USD conversion."
            )

        explanation_lines.append(
            "No row is silently fixed or deleted. Review decisions are stored before committing."
        )

    issue_explanations = [
        {
            "code": code,
            "count": count,
            "explanation": explain_issue_code(code, count),
            "samples": samples.get(code, []),
        }
        for code, count in sorted(by_code.items())
    ]

    return {
        "batch_id": batch.id,
        "filename": batch.original_filename,
        "total_rows": batch.total_rows,
        "issue_count": len(issues),
        "severity_counts": {
            "info": by_severity.get(ImportIssue.Severity.INFO, 0),
            "warning": by_severity.get(ImportIssue.Severity.WARNING, 0),
            "error": by_severity.get(ImportIssue.Severity.ERROR, 0),
        },
        "summary": " ".join(explanation_lines),
        "issue_explanations": issue_explanations,
    }