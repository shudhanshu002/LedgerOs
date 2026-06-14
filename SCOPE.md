# Scope, Anomaly Log, and Schema

This app is scoped around one real workflow: import the flatmates' messy CSV, show every risky row, let an admin decide what to do, then commit only safe financial movements into the ledger.

The CSV is never edited by hand before import. The importer stores the raw row, a normalized interpretation, and any issues it found. Expenses and settlements are created only during the commit step.

## Import Policy

- Upload is non-destructive. It creates an `ImportBatch`, `ImportRow`, and `ImportIssue` records.
- Valid rows can be committed.
- Warning and info rows need review when the importer made an assumption.
- Error rows cannot be committed until they are resolved, approved by policy, skipped, or converted to a settlement where allowed.
- Skipping or rejecting a row closes the row's open issues so the review queue does not keep asking about a row the admin already removed.
- The app keeps the original CSV row for traceability even when a normalized value is used later.

## Detected CSV Problems

| Code | What the app found | Policy |
| --- | --- | --- |
| `AMBIGUOUS_DATE` | Dates such as `04/05/2026` can be read in more than one way. | Flag for review. The parsed date is used only after the reviewer accepts the interpretation. |
| `INVALID_DATE` | `Mar 14` has no year. | Block the row. The importer does not silently guess a year. |
| `MISSING_PAYER` | `House cleaning supplies` has no payer. | Block until a payer is supplied in a future edit flow or the row is skipped. |
| `UNKNOWN_MEMBER` | `Dev's friend Kabir` is not a known group user. | Block until mapped/created in a future flow or skipped. |
| `MISSING_CURRENCY` | One groceries row has an empty currency field. | Block because the app cannot safely convert or store money without a currency. |
| `USD_CONVERTED` | Goa trip rows are in USD. | Convert using configured `USD_TO_INR_RATE`, but surface the assumption for admin review. |
| `AMOUNT_PRECISION` | `899.995` has more than two decimal places. | Require review before rounding to paise. |
| `NEGATIVE_AMOUNT` | `Parasailing refund` is a negative USD amount. | Treat as a refund only after review; normal expense commit blocks non-positive expenses. |
| `ZERO_AMOUNT` | Swiggy row has amount `0`. | Block because a zero-value expense should not change balances. |
| `SETTLEMENT_AS_EXPENSE` | Rows such as `Rohan paid Aisha back` and `Sam deposit share` are repayments, not shared expenses. | Allow admin to import the row as a `Settlement` instead of an `Expense`. |
| `POSSIBLE_DUPLICATE` | Same or very similar spending appears more than once. | Surface both rows and require the reviewer to keep or skip intentionally. |
| `DUPLICATE_CONFLICT` | Similar rows have conflicting amounts, such as the Thalassa dinner entries. | Block until the reviewer chooses how to handle the conflict. |
| `INACTIVE_MEMBER` | A person appears outside their membership period. | Flag for review. This protects Sam from March expenses and Meera from post-move-out rows. |
| `INVALID_PERCENTAGE_TOTAL` | Percentage split does not add to 100. | Block until fixed or skipped. |
| `SPLIT_DETAILS_WITH_EQUAL` | Row says equal split but also includes share details. | Flag for review and keep the backend policy explicit. |
| `INVALID_SPLIT_TYPE` | Split type is missing or not supported. | Block unless the row can be handled as a settlement. |
| `INVALID_EXACT_TOTAL` | Exact/unequal split details do not match the total. | Block because the owed shares would not reconcile. |
| `INVALID_SHARE_VALUE` | Share split contains invalid share values. | Block until corrected or skipped. |
| `MISSING_PARTICIPANTS` | No valid participants can be found for a split. | Block because the app cannot calculate owed shares. |

## Database Schema

Core tables:

- `auth_user`: Django users. Demo users are Aisha, Rohan, Priya, Meera, Dev, and Sam.
- `groups_group`: a shared expense group.
- `groups_groupmembership`: a user's role and membership period in a group.
- `expenses_expense`: committed shared expense.
- `expenses_expensesplit`: per-person owed amount for an expense.
- `expenses_settlement`: a payment from one person to another.
- `imports_importbatch`: one CSV upload attempt.
- `imports_importrow`: raw and normalized row data.
- `imports_importissue`: anomaly detected during import.
- `imports_importdecision`: admin decision for an issue.
- `audit_auditlog`: trace of uploads, decisions, commits, manual expenses, and payments.

Important constraints:

- One split per user per expense.
- One CSV row number per import batch.
- Membership is date-aware through `joined_at` and `left_at`.
- Expenses and settlements are separate financial movements.

## Relational Structure

The relational structure was planned with diagrams.net/draw.io and then implemented in Django models. The key relationship is:

```text
User -> GroupMembership -> Group
Group -> Expense -> ExpenseSplit -> User
Group -> Settlement -> User
Group -> ImportBatch -> ImportRow -> ImportIssue -> ImportDecision
AuditLog records important actions across these entities
```

## Current Known Limitations

- The app can approve, skip, reject, keep, and convert rows to settlements, but it does not yet provide a full inline row editor for fixing blocked row values.
- USD conversion uses a fixed configured rate for reproducibility.
- The demo is built around the supplied assignment CSV and flatmates, though the schema supports more groups and users.
