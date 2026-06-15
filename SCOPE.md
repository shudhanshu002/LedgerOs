# Scope, Anomaly Log, and Schema

LedgerOS is scoped around one financial workflow: take the provided `expenses_export.csv`, preserve what was uploaded, explain every risky row, let an admin decide what to do, and commit only safe ledger movements.

The app does not edit the CSV by hand. Each uploaded row is stored as raw data plus normalized data. That is important for the live review because an evaluator can point at a CSV anomaly and ask exactly what the importer did with it.

## In Scope

- JWT login and protected APIs.
- Groups with date-aware membership.
- Manual expenses and recorded payments.
- CSV upload and anomaly detection.
- Review decisions: approve, keep row, skip row, reject, fix later, import as settlement.
- Commit reviewed rows into expenses or settlements.
- Balance calculation and settlement suggestions from committed rows only.
- Audit trail for upload, review, and commit actions.

## Out Of Scope For This Build

- A full inline editor for rewriting bad CSV rows in the UI.
- Live exchange-rate fetching.
- Multi-currency ledgers beyond converting supported CSV currencies into INR paise.
- Automatic duplicate deletion without user approval.

## Import Policy

| Stage | Policy |
| --- | --- |
| Upload | Non-destructive. Creates import batch, rows, issues, and audit evidence. |
| Detection | Every risky assumption becomes an explicit issue code. |
| Review | Admin must approve, skip, reject, keep, or convert where needed. |
| Commit | Only valid/reviewed rows become expenses or settlements. |
| Traceability | Raw CSV row, normalized row, issue decisions, and committed ledger row remain connected. |

## Import Report

Each upload can produce a downloadable JSON import report from the app.

UI location:

`Import Cockpit -> Import report -> Download JSON report`

API endpoint:

`GET /api/imports/{batch_id}/report/`

The report includes every anomaly detected and the action taken or `PENDING_REVIEW` if no reviewer decision has been made yet.

## Detected CSV Problems

The supplied file produces at least these issue types. Counts can change after review decisions because row statuses move, but the codes remain the same.

| Code | Example from CSV | Why it matters | Handling policy |
| --- | --- | --- | --- |
| `AMBIGUOUS_DATE` | `04/05/2026`, `01/03/2026` | Date format can change who was active. | Surface for review before trusting the parsed date. |
| `INVALID_DATE` | `Mar 14` | Missing year. | Block; no silent guess. |
| `MISSING_PAYER` | House cleaning supplies | Balance cannot credit a payer. | Block until fixed in a future edit flow or skipped. |
| `UNKNOWN_MEMBER` | `Dev's friend Kabir` | Person is not a known group member. | Block until mapped/created or skipped. |
| `MISSING_CURRENCY` | Groceries row with blank currency | Money cannot be safely interpreted. | Block. |
| `USD_CONVERTED` | Goa villa, beach lunch, parasailing | Spreadsheet treats USD like INR. | Convert using configured rate and show the assumption. |
| `AMOUNT_PRECISION` | `899.995` | More than two decimal places. | Flag before rounding to paise. |
| `NEGATIVE_AMOUNT` | Parasailing refund | Could be a refund, not a normal expense. | Flag/block from normal expense commit until reviewed. |
| `ZERO_AMOUNT` | Swiggy row | Zero expense should not change balances. | Block. |
| `SETTLEMENT_AS_EXPENSE` | `Rohan paid Aisha back`, Sam deposit | Payment is not a shared expense. | Allow admin to import as settlement. |
| `POSSIBLE_DUPLICATE` | Marina Bites dinner repeated | Duplicate money can overcharge users. | Ask reviewer to keep or skip intentionally. |
| `DUPLICATE_CONFLICT` | Thalassa dinner with different amounts | Similar expense, conflicting amount. | Block until reviewer chooses. |
| `INACTIVE_MEMBER` | Meera after leaving, Sam before joining, Dev outside trip | Membership timeline affects who owes. | Surface; reviewer decides if row is intentional. |
| `INVALID_PERCENTAGE_TOTAL` | Percent split not adding to 100 | Owed shares would not reconcile. | Block. |
| `SPLIT_DETAILS_WITH_EQUAL` | Equal split with share details | Conflicting instructions. | Flag and document backend policy. |
| `INVALID_SPLIT_TYPE` | Missing/unsupported split type | Split cannot be calculated. | Block unless settlement policy applies. |
| `INVALID_EXACT_TOTAL` | Exact values do not equal total | Ledger would not balance. | Block. |
| `INVALID_SHARE_VALUE` | Bad share values | Weighted split cannot be trusted. | Block. |
| `MISSING_PARTICIPANTS` | No valid split members | No one can be charged. | Block. |

## Schema Overview

Core relational tables:

| Table | Purpose |
| --- | --- |
| `auth_user` | Login users: Aisha, Rohan, Priya, Meera, Dev, Sam. |
| `groups_group` | Shared expense workspace. |
| `groups_groupmembership` | Role plus `joined_at`/`left_at` timeline. |
| `expenses_expense` | Committed shared expense. |
| `expenses_expensesplit` | Per-person owed share for an expense. |
| `expenses_settlement` | Direct payment from one user to another. |
| `imports_importbatch` | One uploaded CSV file. |
| `imports_importrow` | Raw row, normalized row, row hash, row status. |
| `imports_importissue` | One detected anomaly. |
| `imports_importdecision` | Reviewer decision with before/after state. |
| `audit_auditlog` | Operational evidence for financial actions. |

## Relationship Sketch

The relationship structure was planned in diagrams.net/draw.io before implementation:

```text
User
  -> GroupMembership
  -> Group
       -> Expense
            -> ExpenseSplit -> User
       -> Settlement
            -> paid_by User
            -> paid_to User
       -> ImportBatch
            -> ImportRow
                 -> ImportIssue
                      -> ImportDecision
       -> AuditLog evidence through action metadata
```

## Balance Rule

For each person:

```text
balance = expenses paid
        - expense shares owed
        + settlements paid
        - settlements received
```

Positive balance means the person should receive money. Negative balance means the person owes money. The balance engine keeps the group total at zero.

## Current Demo State

The seeded/live demo currently represents a partially reviewed import:

- Some CSV rows are committed into expenses.
- Some rows remain blocked or need review.
- One legitimate recorded payment remains: Rohan paid Aisha.
- Manual test rows were removed.

This is intentional for the assignment: the reviewer can see committed data and still inspect unresolved anomalies.
