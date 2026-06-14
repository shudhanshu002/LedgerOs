from typing import Any

from django.contrib.auth.models import AnonymousUser, User

from apps.audit.models import AuditLog


def create_audit_log(
    *,
    actor: User,
    action: str,
    entity_type: str,
    entity_id: str | int | None = None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    note: str = "",
    metadata: dict[str, Any] | None = None,
) -> AuditLog | None:
    """
    Creates one audit log entry.

    We keep this as a helper so every app logs actions consistently.

    Example:
    create_audit_log(
        actor=request.user,
        action=AuditLog.Action.REVIEW_IMPORT_ISSUE,
        entity_type="ImportIssue",
        entity_id=issue.id,
        before={"status": "OPEN"},
        after={"status": "APPROVED"},
        note="Approved duplicate skip",
    )
    """

    if not actor or isinstance(actor, AnonymousUser) or not actor.is_authenticated:
        return None

    return AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id or ""),
        before=before,
        after=after,
        note=note,
        metadata=metadata or {},
    )


def audit_import_upload(
    *,
    actor: User,
    batch,
) -> AuditLog | None:
    """
    Logs CSV upload.
    """

    return create_audit_log(
        actor=actor,
        action=AuditLog.Action.UPLOAD_IMPORT,
        entity_type="ImportBatch",
        entity_id=batch.id,
        after={
            "filename": batch.original_filename,
            "total_rows": batch.total_rows,
            "status": batch.status,
            "summary": batch.summary,
        },
        note="Uploaded CSV and generated import report.",
    )


def audit_import_issue_decision(
    *,
    actor: User,
    issue,
    decision: str,
    before: dict[str, Any],
    after: dict[str, Any],
    note: str = "",
) -> AuditLog | None:
    """
    Logs review decision for one import issue.
    """

    return create_audit_log(
        actor=actor,
        action=AuditLog.Action.REVIEW_IMPORT_ISSUE,
        entity_type="ImportIssue",
        entity_id=issue.id,
        before=before,
        after=after,
        note=note,
        metadata={
            "decision": decision,
            "issue_code": issue.code,
            "severity": issue.severity,
            "batch_id": issue.batch_id,
            "row_id": issue.row_id,
        },
    )


def audit_import_commit(
    *,
    actor: User,
    batch,
    result: dict[str, Any],
) -> AuditLog | None:
    """
    Logs import commit result.
    """

    return create_audit_log(
        actor=actor,
        action=AuditLog.Action.COMMIT_IMPORT,
        entity_type="ImportBatch",
        entity_id=batch.id,
        before={
            "status": batch.status,
        },
        after=result,
        note="Committed reviewed import rows into ledger.",
    )


def audit_manual_expense_create(
    *,
    actor: User,
    expense,
) -> AuditLog | None:
    """
    Logs manually created expense.
    """

    return create_audit_log(
        actor=actor,
        action=AuditLog.Action.CREATE_EXPENSE,
        entity_type="Expense",
        entity_id=expense.id,
        after={
            "group_id": expense.group_id,
            "paid_by_id": expense.paid_by_id,
            "description": expense.description,
            "amount_paise": expense.amount_paise,
            "expense_date": expense.expense_date.isoformat(),
            "split_type": expense.split_type,
        },
        note="Manually created expense.",
    )


def audit_settlement_create(
    *,
    actor: User,
    settlement,
) -> AuditLog | None:
    """
    Logs manually recorded settlement.
    """

    return create_audit_log(
        actor=actor,
        action=AuditLog.Action.RECORD_SETTLEMENT,
        entity_type="Settlement",
        entity_id=settlement.id,
        after={
            "group_id": settlement.group_id,
            "paid_by_id": settlement.paid_by_id,
            "paid_to_id": settlement.paid_to_id,
            "amount_paise": settlement.amount_paise,
            "settlement_date": settlement.settlement_date.isoformat(),
        },
        note="Recorded settlement/payment.",
    )