# SCOPE.md — LedgerOS Scope, Anomaly Log, and Database Schema

## 1. Product scope

LedgerOS is a shared expenses app for a flatmate group that migrated from a messy spreadsheet to a controlled ledger system.

The app is built for the assignment scenario:

- Aisha wants final settlement numbers.
- Rohan wants no magic numbers and full balance traceability.
- Priya wants USD expenses handled correctly.
- Sam does not want to pay for expenses before joining.
- Meera wants duplicate cleanup but only after user approval.

The main product workflow is:

```txt
Import spreadsheet → detect anomalies → surface issues → review decisions → commit safe rows → calculate balances → audit everything
```

## 2. In scope

### Authentication

- JWT login
- Protected backend endpoints
- Protected frontend routes
- Demo users seeded for assignment testing

### Groups and memberships

- Group creation/storage
- Group membership records
- Join date and leave date per member
- Historical membership validation for imported expenses

### Expenses

- Expense creation from safe import rows
- Payer tracking
- Participant tracking
- Split records
- Money storage in integer paise
- Original currency and normalized INR value

### Split types

The importer supports every split type present in the CSV:

| Split type | Meaning | Handling |
|---|---|---|
| `equal` | Amount split equally among listed participants | Amount divided across participants with deterministic remainder handling |
| `unequal` / exact | Split details contain exact amounts per participant | Details must sum to expense amount |
| `percentage` | Split details contain percentage per participant | Percentages must total 100% |
| `share` | Split details contain share counts | Amount divided proportionally by shares |

### Settlements

- Settlement-like rows are not blindly imported as expenses.
- Rows such as “Rohan paid Aisha back” are flagged as settlement candidates.
- Settlement records are separate from expenses.

### CSV import

- User uploads `expenses_export.csv` through the app.
- The file is ingested exactly as provided.
- The CSV must not be manually edited before import.
- Every row becomes an import row record.
- Anomaly detection creates import issues.
- Safe rows can be committed.
- Risky rows require policy-based handling.

### Import report

The app produces an import report containing:

- total rows
- valid rows
- rows needing review
- blocked rows
- issue codes
- severity
- affected rows
- recommended action
- user decision/action taken
- commit result

### Balances

- Group balance summary
- Individual member net balance
- Suggested settlements
- Member-level breakdown

### Audit trail

The app records:

- CSV uploads
- issue decisions
- import commits
- settlement actions where applicable

## 3. Out of scope for current submission

These are intentionally out of scope for the 2-day assignment version:

- Real-time multi-user collaboration
- Bank account integration
- Live exchange-rate lookup
- Receipt OCR
- Payment gateway integration
- Production-grade notification system
- Advanced role-management UI
- Full mobile-native app
- AI-generated financial calculations

## 4. Core policies

### 4.1 Money policy

All money is stored as integer paise.

Examples:

```txt
₹100.00 → 10000
₹100.50 → 10050
```

Reason:

- avoids floating point errors
- makes hand calculation easier in live review
- keeps split totals deterministic

### 4.2 Currency policy

The ledger currency is INR.

CSV rows may contain:

- INR
- USD
- missing currency

Policy:

```txt
INR rows are imported directly.
USD rows are converted to INR using the configured USD_TO_INR_RATE.
Missing currency rows are flagged and require review.
Unsupported currencies are blocked.
```

Current deterministic development conversion:

```txt
1 USD = ₹83.00
```

AI is not used to decide exchange rates or calculate money.

### 4.3 Date policy

Accepted date formats include clear ISO and configured Indian-style formats.

Examples:

```txt
2026-02-01
01/03/2026
15/03/2026
```

Risky date cases are flagged:

- ambiguous dates such as `04/05/2026`
- incomplete natural language dates such as `Mar 14`
- invalid/unparseable dates

Policy:

```txt
Clear dates are normalized.
Ambiguous dates are surfaced for review.
Unparseable dates are blocked.
```

### 4.4 Name normalization policy

The importer trims whitespace and performs case-insensitive matching.

Examples:

```txt
priya → Priya
rohan  → Rohan
```

However, unknown aliases are not silently guessed.

Example:

```txt
Priya S
Dev's friend Kabir
```

Policy:

```txt
Simple casing/spacing differences may be normalized.
Unknown names or aliases are flagged as UNKNOWN_MEMBER.
```

### 4.5 Membership timeline policy

A member is active on an expense date only if:

```txt
joined_at <= expense_date AND (left_at IS NULL OR expense_date <= left_at)
```

Policy:

```txt
If a payer or participant is outside their membership window, the row is flagged as INACTIVE_MEMBER.
Rows are not silently committed if the inactive member affects who owes money.
```

This protects:

- Sam before mid-April
- Meera after moving out
- Dev outside the trip/member window

### 4.6 Duplicate policy

Duplicates are never silently deleted.

Policy:

```txt
Exact duplicates and duplicate-like conflicts are surfaced to the user.
No row automatically wins.
A user decision is required before deletion, skipping, or keeping.
```

This directly satisfies Meera’s request.

### 4.7 Settlement policy

Rows that look like repayments are not treated as expenses.

Examples:

```txt
Rohan paid Aisha back
Sam deposit share
```

Policy:

```txt
Settlement-like rows are flagged as SETTLEMENT_AS_EXPENSE.
They may be committed as Settlement records only after policy/review allows it.
```

### 4.8 Zero and negative amount policy

Policy:

```txt
Zero amount rows are blocked or require explicit review because they do not represent a real expense.
Negative amount rows are flagged because they may represent refunds, reversals, or data-entry mistakes.
```

The app does not silently convert negative values into expenses.

## 5. CSV anomaly log

The provided CSV contains 42 rows and at least 12 deliberate data problems. During development the importer detected 39 issue instances from the full CSV.

The following table documents the major anomalies and the chosen policy.

| Code | Example row(s) | Problem | Policy / action |
|---|---:|---|---|
| `POSSIBLE_DUPLICATE` | 4 and 5 | “Dinner at Marina Bites” and “dinner - marina bites” appear to represent the same expense | Surface to user; do not delete automatically |
| `DUPLICATE_CONFLICT` | 23 and 24 | “Dinner at Thalassa” and “Thalassa dinner” have similar meaning but different amounts/payers | Block automatic commit until reviewed; no row automatically wins |
| `AMOUNT_FORMAT_NORMALIZED` | 6, 28 | Amount has comma or extra spaces: `1,200`, ` 1450 ` | Normalize value and show as warning if policy requires visibility |
| `AMOUNT_PRECISION` | 9 | `899.995` has more than 2 decimal places | Flag for review; money must be stored as paise |
| `NAME_NORMALIZED` | 8, 26 | `priya`, `rohan ` differ only by case/spacing | Normalize safely to known member; optionally log warning |
| `UNKNOWN_MEMBER` | 10, 22 | `Priya S`, `Dev's friend Kabir` are not known members | Block or require review; do not silently map to a known member |
| `MISSING_PAYER` | 12 | Payer is empty | Block commit until payer is provided or row is skipped |
| `SETTLEMENT_AS_EXPENSE` | 13, possible 37 | Repayment/deposit-like row is stored in expense format | Do not import as normal expense; review as settlement candidate |
| `INVALID_PERCENTAGE_TOTAL` | 14, 31 | Percentages total 110%, not 100% | Block or require correction; cannot calculate fair split silently |
| `AMBIGUOUS_DATE` | 26, 33 | `Mar 14` lacks year; `04/05/2026` can mean Apr 5 or May 4 | Surface for review; avoid silent date assumption |
| `USD_CONVERTED` | 19, 20, 22, 25 | Expenses in USD must not be treated as INR | Convert using fixed documented rate; surface conversion in report |
| `NEGATIVE_AMOUNT` | 25 | `-30 USD` refund/reversal | Flag as refund candidate; not a normal expense without review |
| `MISSING_CURRENCY` | 27 | Currency is blank | Requires review; do not silently assume INR unless policy decision is explicit |
| `ZERO_AMOUNT` | 30 | Amount is `0` | Block or review; zero amount does not produce meaningful balance |
| `INACTIVE_MEMBER` | 35, 37, 38, 39 and possible Dev rows depending membership seed | Member appears before joining or after leaving | Flag and block/review; membership timeline controls validity |
| `SPLIT_DETAILS_WITH_EQUAL` | 41 | `split_type` is equal but split details contain shares | Surface for review; split type and details disagree |
| `MISSING_SPLIT_TYPE` | 13 | Settlement-like row has blank split type | Treat as settlement candidate, not normal expense |

## 6. Row-level notes for important cases

### Rows 4 and 5 — Marina Bites duplicate

```txt
2026-02-08 Dinner at Marina Bites Dev 3200 INR
2026-02-08 dinner - marina bites Dev 3200 INR
```

These rows are normalized to detect that description text is very similar. The app flags them instead of deleting one automatically.

### Row 9 — Cylinder refill precision

```txt
899.995 INR
```

This cannot be represented cleanly as paise without a rounding decision. It is flagged because the app must not hide rounding.

### Row 12 — Missing payer

```txt
House cleaning supplies, paid_by empty
```

The row cannot be committed because balance calculation needs a payer.

### Row 13 — Settlement recorded as expense

```txt
Rohan paid Aisha back
```

This is not a shared expense. It affects balances as a payment between two people, so it should be handled as a settlement.

### Rows 14 and 31 — Invalid percentage split

```txt
Aisha 30%; Rohan 30%; Priya 30%; Meera 20% = 110%
```

The app blocks or requires correction because percentages must total 100%.

### Rows 19, 20, 22, 25 — USD expenses

These rows are converted using the configured USD to INR rate and surfaced in the import report.

### Row 22 — Unknown member Kabir

```txt
Dev's friend Kabir
```

Kabir is not a seeded user/member. The app flags this instead of silently ignoring him.

### Row 25 — Negative refund

```txt
Parasailing refund, -30 USD
```

This is likely a refund, not a normal expense. It requires review or refund-specific handling.

### Row 27 — Missing currency

```txt
Groceries DMart, currency empty
```

The importer must not silently assume INR unless explicitly documented. It is surfaced as a missing currency issue.

### Row 33 — Ambiguous date

```txt
04/05/2026
```

The note says: “is this April 5 or May 4?” The app should surface this to the user and avoid silently choosing.

### Row 35 — Meera after move-out

```txt
2026-04-02 Groceries includes Meera
```

Meera moved out at the end of March, so this is flagged as membership timeline violation.

### Rows 37–39 — Sam before active membership date

Sam is moving in around mid-April. Rows before his official join date are treated carefully and may be flagged depending on the configured `joined_at`.

### Row 41 — Equal split with share details

```txt
split_type = equal
split_details = Aisha 1; Rohan 1; Priya 1; Sam 1
```

Even though the shares are equal, the row contains conflicting representation. It is surfaced because the spreadsheet has inconsistent structure.

## 7. Database schema

The exact Django model files are in the backend app modules. The conceptual schema is below.

### User

Represents an authenticated person.

Important fields:

- id
- username
- email
- password hash

### Group

Represents a shared ledger workspace.

Important fields:

- id
- name
- description
- created_by
- created_at
- updated_at

Recommended default group:

```txt
Flatmates Ledger 2026
```

### GroupMembership

Represents a member’s relationship to a group over time.

Important fields:

- id
- group
- user
- role
- joined_at
- left_at
- created_at
- updated_at

Why it exists:

A simple many-to-many relation cannot answer “Was Sam active on this expense date?”

### Expense

Represents a committed expense in the ledger.

Important fields:

- id
- group
- paid_by
- description
- expense_date
- amount_paise
- currency
- original_amount
- original_currency
- split_type
- source_import_batch
- source_import_row
- created_at
- updated_at

### ExpenseSplit

Represents how much each participant owes for an expense.

Important fields:

- id
- expense
- user
- owed_paise
- metadata/details

### Settlement

Represents a payment from one member to another.

Important fields:

- id
- group
- paid_by
- paid_to
- amount_paise
- settled_at
- source_import_batch
- source_import_row
- note

Why settlement is separate from expense:

A settlement transfers debt. It is not a cost that should be split among members.

### ImportBatch

Represents a single CSV upload.

Important fields:

- id
- group
- filename
- status
- total_rows
- valid_rows
- needs_review_rows
- blocked_rows
- uploaded_by
- created_at
- committed_at

### ImportRow

Represents one raw row from the uploaded CSV.

Important fields:

- id
- batch
- row_number
- raw_data
- normalized_data
- status
- commit_status
- linked_expense
- linked_settlement

Why raw data is stored:

The app must be able to show exactly what was in the CSV during live review.

### ImportIssue

Represents one anomaly found in one import row.

Important fields:

- id
- batch
- row
- code
- severity
- message
- suggested_action
- status
- decision
- decided_by
- decided_at
- metadata

### AuditLog

Represents evidence of important system actions.

Important fields:

- id
- actor
- action
- entity_type
- entity_id
- metadata
- created_at

Common actions:

- `UPLOAD_IMPORT`
- `REVIEW_IMPORT_ISSUE`
- `COMMIT_IMPORT`
- `CREATE_SETTLEMENT`

## 8. Balance calculation scope

Balances are calculated only from committed ledger records.

For each expense:

```txt
payer balance += expense amount
participant balance -= owed share
```

For each settlement:

```txt
payer balance += settlement amount paid
receiver balance -= settlement amount received
```

Final meaning:

```txt
positive balance = user should receive money
negative balance = user owes money
```

Suggested settlements are generated by matching debtors to creditors until balances reach zero.

## 9. Security and permissions scope

Recommended product rule:

- Admin/operator can upload CSV, review issues, and commit batches.
- Normal members can view groups, balances, and their breakdowns.
- Users outside the group should not see or mutate group data.

The demo flow uses Aisha as the operator/admin.

