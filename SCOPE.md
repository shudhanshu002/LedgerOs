# Scope

This document defines what is included in the current backend version and what is intentionally left for future improvement.

## Included in Current Scope

### 1. Authentication

Included:

* JWT login
* JWT refresh
* current user endpoint
* Google Auth service support

Endpoints:

```txt
POST /api/auth/token/
POST /api/auth/token/refresh/
GET  /api/auth/me/
POST /api/auth/google/
```

### 2. Groups

Included:

* create groups
* list user groups
* update groups
* delete groups
* group memberships
* admin/member roles
* membership join date
* membership leave date

The membership timeline is used during CSV validation.

Example:

```txt
Sam joined on 2026-04-15.
So Sam should not be charged for expenses before 2026-04-15.
```

### 3. Expenses

Included:

* manual expense creation
* payer
* category
* expense date
* amount
* currency
* split type
* split rows

Supported split types:

```txt
EQUAL
EXACT
PERCENTAGE
SHARE
```

### 4. Money Handling

Included:

* amounts stored in paise
* INR ledger
* USD to INR conversion using configured fixed rate
* deterministic paise remainder allocation

Example:

```txt
₹100 split among 3 users = 34, 33, 33 paise distribution at paise level.
```

### 5. Settlements

Included:

* record settlement/payment between two users
* settlements affect balances
* settlement rows are separate from expense rows

### 6. CSV Import

Included:

* upload CSV
* parse official CSV headers
* normalize rows
* create import batch
* create import rows
* detect anomalies
* review issues
* commit valid rows
* partial commit support

The upload endpoint does not directly create expenses.

### 7. Anomaly Detection

Included issue types:

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

### 8. Review Workflow

Included decisions:

```txt
APPROVE
REJECT
SKIP_ROW
KEEP_ROW
IMPORT_AS_SETTLEMENT
FIX_LATER
```

### 9. Commit Workflow

Included:

* commit only valid rows
* block unresolved error rows
* block unapproved review-required rows
* partially commit safe rows
* leave risky rows for review

### 10. Balances

Included:

* group-wise balances
* per-user balance summary
* detailed breakdown
* suggested settlements

### 11. Audit Logs

Included:

* CSV upload audit
* issue review audit
* import commit audit
* read-only admin audit view

## Out of Scope for Current Version

### 1. Frontend

Frontend is not included in the backend completion stage.

It will be implemented separately using React + Vite + TypeScript.

### 2. Real-Time Expense Chat

The assignment mentions user chat in an expense with real-time updates.

This is not included in the current backend version yet.

Planned future implementation:

* WebSocket support
* ExpenseComment model
* real-time comment events
* notification updates

### 3. Full External LLM Integration

The current AI explanation is deterministic.

It does not call OpenAI, Gemini, or any external LLM API.

Reason:

* demo stability
* no API key dependency
* deterministic outputs
* easier testing

A real LLM can be added later as an optional enhancement.

### 4. Full Name Mapping UI

The backend detects unknown members, but does not yet provide a full mapping UI.

Current behavior:

* unknown names are blocked
* issue is created
* admin can review

Future behavior:

* map CSV name to existing user
* create new user during import review
* save aliases

### 5. Editing Imported Rows

The current backend detects bad rows and blocks them.

Future improvement:

* edit normalized row values
* re-run validation on edited row
* then commit corrected row

### 6. Production Deployment

Deployment is not included in this local backend verification stage.

Planned deployment:

* backend on Render/Railway/Fly.io
* database on Neon PostgreSQL
* frontend on Vercel
* environment variables configured in hosting dashboard

## Current Verified State

The backend was tested locally with the provided CSV.

Result before commit:

```txt
total_rows: 42
valid_rows: 16
needs_review_rows: 17
blocked_rows: 9
issue_count: 39
```

Result after commit:

```txt
status: PARTIALLY_COMMITTED
committed_rows: 16
needs_review_rows: 17
blocked_rows: 9
```

This confirms that safe rows are committed and risky rows are preserved for review.
