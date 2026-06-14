# AI Usage

This document explains how AI was used while building the Shared Expenses App backend.

## AI Tool Used

I used ChatGPT as my primary AI development collaborator.

The AI was used like a junior engineering partner, not as a replacement for engineering decisions. I used it to ask questions, break down requirements, design backend structure, generate implementation drafts, debug errors, and improve documentation.

## How AI Was Used

### 1. Requirement Breakdown

AI helped convert the assignment requirements into smaller backend modules:

* authentication
* groups
* group memberships
* expenses
* split calculation
* settlements
* CSV import
* anomaly detection
* import review
* audit logs
* AI-style explanation
* balances

This helped avoid building the project randomly and made the backend easier to test.

### 2. Architecture Planning

AI helped design the backend folder structure:

```txt
backend/
  apps/
    accounts/
    groups/
    expenses/
    imports/
    audit/
    ai/
```

Each app has a clear responsibility.

### 3. Database Model Design

AI helped draft relational models for:

* Group
* GroupMembership
* Expense
* ExpenseSplit
* Settlement
* ImportBatch
* ImportRow
* ImportIssue
* ImportDecision
* AuditLog

I reviewed and tested the models using Django migrations and Django Admin.

### 4. CSV Import Design

AI helped design the safe CSV import flow:

```txt
Upload CSV
→ Normalize rows
→ Detect anomalies
→ Create review issues
→ Commit only valid/reviewed rows
```

This was important because the CSV contains ambiguous and risky financial data.

### 5. Anomaly Detection Policies

AI helped list and define anomaly codes such as:

```txt
AMBIGUOUS_DATE
AMOUNT_PRECISION
DUPLICATE_CONFLICT
INACTIVE_MEMBER
INVALID_DATE
INVALID_PERCENTAGE_TOTAL
MISSING_CURRENCY
MISSING_PAYER
NEGATIVE_AMOUNT
POSSIBLE_DUPLICATE
SETTLEMENT_AS_EXPENSE
SPLIT_DETAILS_WITH_EQUAL
UNKNOWN_MEMBER
USD_CONVERTED
ZERO_AMOUNT
```

I then tested these policies against the provided `expenses_export.csv`.

### 6. Debugging

AI helped debug local setup issues.

Example:

The first migration attempt failed because the `requests` package was missing for Google Auth transport. AI identified the missing dependency and recommended adding:

```txt
requests>=2.32,<3
```

to `requirements.txt`.

### 7. Documentation

AI helped draft:

* README.md
* SCOPE.md
* DECISIONS.md
* AI_USAGE.md
* Postman collection structure

I reviewed the content and adjusted it based on the actual backend behavior.

## What AI Did Not Do

AI did not deploy the app automatically.

AI did not make final product decisions independently.

AI did not test the backend without my manual verification.

I manually ran:

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

I also manually tested the API using Postman.

## Verified Backend Results

Using the provided `expenses_export.csv`, the backend produced:

```txt
total_rows: 42
valid_rows before commit: 16
needs_review_rows: 17
blocked_rows: 9
issue_count: 39
```

After commit:

```txt
status: PARTIALLY_COMMITTED
committed_rows: 16
needs_review_rows: 17
blocked_rows: 9
```

This confirms that the backend safely committed clean rows and kept risky rows blocked or under review.

## Final Note

AI was used as a development assistant for speed, structure, debugging, and documentation.

The final backend was tested manually through Django Admin and Postman.
