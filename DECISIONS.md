# Technical Decisions

This document explains the important technical and product decisions made while building the Shared Expenses backend.

## 1. Django REST Framework for Backend

I used Django REST Framework because it provides:

* fast API development
* relational model support
* admin panel
* authentication integration
* serializer validation
* clean ViewSet routing

This matches the assignment because the product is data-heavy and requires relational database behavior.

## 2. Relational Database Only

The app uses relational models for:

* users
* groups
* memberships
* expenses
* expense splits
* settlements
* import batches
* import rows
* import issues
* audit logs

This satisfies the requirement to use relational databases only.

## 3. Money Stored as Integer Paise

Amounts are stored as integer paise instead of float.

Reason:

Floating point numbers can create rounding errors in money calculations.

Example:

```txt
₹1200.50 = 120050 paise
```

This makes balance calculation deterministic and safe.

## 4. INR Ledger with Currency Conversion

The internal ledger stores values in INR paise.

CSV rows can contain INR or USD.

USD rows are converted using:

```txt
USD_TO_INR_RATE
```

The conversion is flagged as an import issue:

```txt
USD_CONVERTED
```

Reason:

Currency conversion should be visible and reviewable.

## 5. CSV Upload Does Not Directly Create Expenses

CSV upload only creates:

```txt
ImportBatch
ImportRow
ImportIssue
```

It does not directly create:

```txt
Expense
ExpenseSplit
Settlement
```

Reason:

CSV data can contain duplicates, missing payer, invalid dates, wrong split totals, unknown members, or settlement rows.

Financial data should not silently affect balances.

## 6. Import Review Before Commit

The import flow is:

```txt
Upload CSV
→ Analyze rows
→ Show issues
→ User reviews
→ Commit safe rows
```

This is safer than importing everything directly.

## 7. Partial Commit

The commit step supports partial commit.

If 16 rows are valid and 26 rows are risky:

```txt
16 rows are committed
26 rows remain blocked or under review
```

Reason:

Clean data should not be blocked only because unrelated rows are bad.

## 8. Separate Expense and Settlement Models

Expenses and settlements are stored separately.

Reason:

An expense creates shared debt.

A settlement reduces existing debt.

If a settlement is imported as an expense, balances become wrong.

Therefore settlement-like CSV rows are flagged as:

```txt
SETTLEMENT_AS_EXPENSE
```

## 9. Membership Timeline Validation

Group memberships have:

```txt
joined_at
left_at
```

This lets the system detect if someone was charged outside their membership period.

Examples:

```txt
Meera left on 2026-03-31.
Sam joined on 2026-04-15.
```

So the importer can flag:

```txt
INACTIVE_MEMBER
```

## 10. Deterministic Remainder Allocation

When an amount cannot split perfectly into paise, extra paise go to earlier participants.

Example:

```txt
₹1.00 split among 3 users
= 34 paise, 33 paise, 33 paise
```

Reason:

The system must be deterministic and explainable.

## 11. AI-Style Explanation Without External LLM

The AI explanation endpoint is deterministic.

It does not call an external AI API.

Reason:

* stable demo
* no API key dependency
* predictable output
* easier testing
* avoids network/API failures

The endpoint still provides AI-like output:

* issue meaning
* risk
* recommended action
* sample rows

## 12. Audit Logs Are Append-Only

Audit logs are created for important actions:

```txt
CSV upload
issue decision
batch commit
```

Audit logs are read-only in Django Admin.

Reason:

Audit history should not be manually edited or deleted.

## 13. Django Admin for Review and Debugging

Admin registration was added for:

```txt
Groups
Group memberships
Expenses
Expense splits
Settlements
Import batches
Import rows
Import issues
Import decisions
Audit logs
```

Reason:

During development and live review, admin makes it easy to inspect data and prove the backend flow.

## 14. Seed Command for Demo Consistency

A `seed_demo` management command creates:

```txt
Aisha
Rohan
Priya
Meera
Dev
Sam
Goa Trip 2026
membership timeline
```

Reason:

The reviewer can run one command and reproduce the same demo state.

## 15. Current Limitation

The backend currently detects bad rows but does not provide full row editing.

Future improvement:

```txt
Edit normalized row
Re-run validation
Commit corrected row
```
