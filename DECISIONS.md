# DECISIONS.md — LedgerOS Decision Log

This file records the product and engineering decisions made for the Shared Expenses App assignment.

The goal was not only to build a polished UI. The goal was to handle imperfect financial data deliberately, make every important assumption explicit, and build a codebase that can be explained in a live technical session.

## Decision 1 — Build a review-first ledger, not only a Splitwise clone

### Problem

The assignment is based on a messy spreadsheet, not clean manually entered expenses. The CSV contains duplicates, inconsistent formats, USD expenses, membership changes, and settlement-like rows.

### Options considered

1. Build a simple Splitwise clone with manual expense creation.
2. Build a direct CSV importer that imports everything automatically.
3. Build a review-first ledger where CSV rows are staged, checked, reviewed, and then committed.

### Decision

Chosen option: **review-first ledger**.

### Reason

The assignment explicitly says a crashed import and a silent guess are both failing answers. A review-first import pipeline gives the safest behavior:

```txt
raw row → normalized row → issue detection → user review → safe commit
```

This also satisfies Meera’s request that duplicates should not be deleted or changed without approval.

## Decision 2 — Rename the workspace to Flatmates Ledger 2026

### Problem

The CSV is not only about the Goa trip. It includes rent, groceries, utilities, maid salary, move-in/move-out expenses, deposits, settlements, and Goa trip expenses.

### Options considered

1. Keep the group name as `Goa Trip 2026`.
2. Create multiple groups: Flat, Goa Trip, Deposits, etc.
3. Use one group named `Flatmates Ledger 2026` and treat Goa as a subset of expenses.

### Decision

Chosen option: **Flatmates Ledger 2026**.

### Reason

The assignment describes one shared spreadsheet for flatmates since February. Goa is only one high-risk subset because it contains Dev and USD transactions. One evolving group with membership history best matches the assignment.

## Decision 3 — Use Django REST Framework for backend

### Problem

The app needs authentication, relational models, API endpoints, CSV import services, audit logs, and deployment readiness.

### Options considered

1. Next.js full-stack only
2. Node.js/Express backend
3. Django REST Framework backend

### Decision

Chosen option: **Django REST Framework**.

### Reason

Django provides strong built-in support for relational modeling, authentication, admin inspection, migrations, and service-layer code. DRF makes API creation straightforward. It is also easier to explain model relationships in a live technical walkthrough.

## Decision 4 — Use React/Vite for frontend

### Problem

The frontend needs dashboard views, upload workflows, review queues, and balance visualizations.

### Options considered

1. Server-rendered Django templates
2. Next.js frontend
3. React + Vite frontend

### Decision

Chosen option: **React + Vite + TypeScript**.

### Reason

The assignment benefits from an interactive frontend: CSV upload, issue review, batch switching, live status cards, and balance breakdown views. Vite keeps the frontend fast and simple for a 2-day assignment.

## Decision 5 — Use a relational database only

### Problem

The assignment explicitly requires relational DBs only.

### Options considered

1. MongoDB / document database
2. SQLite locally and PostgreSQL in production
3. PostgreSQL only

### Decision

Chosen option: **SQLite locally and PostgreSQL/Neon-ready for production**.

### Reason

SQLite is convenient for local development, while PostgreSQL/Neon matches production deployment needs. Both are relational databases and work through Django ORM.

## Decision 6 — Store money as integer paise

### Problem

Money calculations must be precise and explainable. The CSV has values such as `899.995`, USD conversion, percentage splits, and share splits.

### Options considered

1. Store money as floating point numbers
2. Store money as decimal fields only
3. Store money as integer paise

### Decision

Chosen option: **integer paise**.

### Reason

Floating point can create rounding errors. Integer paise makes every balance calculation reproducible and explainable.

Example:

```txt
₹1200.50 → 120050 paise
```

## Decision 7 — Use deterministic rounding

### Problem

Some split calculations do not divide evenly. For example, ₹1199 split among 4 people cannot be divided into equal paise without a remainder.

### Options considered

1. Use floats and round visually only
2. Round each share independently
3. Use integer division and distribute remaining paise deterministically

### Decision

Chosen option: **deterministic paise remainder distribution**.

### Reason

The sum of split shares must always equal the original expense amount. Any leftover paise is assigned deterministically, so the same input always gives the same output.

## Decision 8 — Use membership timeline instead of current members only

### Problem

Sam moved in mid-April and Meera moved out at the end of March. Current membership alone cannot decide whether they owe a historical expense.

### Options considered

1. Store only current group members
2. Store a many-to-many relation without dates
3. Store membership records with `joined_at` and `left_at`

### Decision

Chosen option: **timeline-based GroupMembership**.

### Reason

The CSV must be validated against the expense date. This directly satisfies Sam’s request.

Membership rule:

```txt
joined_at <= expense_date AND (left_at IS NULL OR expense_date <= left_at)
```

## Decision 9 — Keep settlement separate from expenses

### Problem

The CSV includes rows that are not shared expenses, such as “Rohan paid Aisha back.” If imported as an expense, balances would be wrong.

### Options considered

1. Import settlement rows as normal expenses
2. Drop settlement rows
3. Store settlements in a separate model

### Decision

Chosen option: **separate Settlement model**.

### Reason

An expense creates shared debt. A settlement reduces debt between two people. They are different financial events and must be modeled separately.

## Decision 10 — Do not silently delete duplicates

### Problem

The spreadsheet contains duplicate or duplicate-like rows. Meera specifically asked to approve anything the app deletes or changes.

### Options considered

1. Automatically delete exact duplicates
2. Keep all duplicate rows
3. Flag duplicates and let the user decide

### Decision

Chosen option: **flag duplicates and require review**.

### Reason

Automatic deletion is risky. The assignment rewards deliberate handling. Duplicate rows become `ImportIssue` records and are visible in the import report.

## Decision 11 — Convert USD using a fixed configured rate

### Problem

The CSV contains USD expenses. Priya says the sheet pretending USD is INR is wrong.

### Options considered

1. Treat USD amount as INR
2. Block all USD rows
3. Fetch live exchange rates
4. Use a fixed documented conversion rate

### Decision

Chosen option: **fixed documented USD_TO_INR_RATE**.

### Reason

The assignment needs reproducible behavior. A live exchange-rate API would make balances change depending on time/network. A fixed rate is transparent and testable.

Current rate:

```txt
1 USD = ₹83.00
```

## Decision 12 — AI does not calculate balances

### Problem

AI can hallucinate or produce inconsistent calculations. Financial balances need deterministic correctness.

### Options considered

1. Use AI to parse and calculate balances
2. Use AI to suggest anomaly policies
3. Use deterministic code for calculations and AI-style explanations only

### Decision

Chosen option: **deterministic financial logic, AI-style explanation layer only**.

### Reason

Balances must be explainable and testable by hand. AI can help explain issues, but it should not be trusted to calculate money.

## Decision 13 — Store raw CSV rows

### Problem

In the live evaluation, reviewers may ask what happened to a specific row.

### Options considered

1. Parse CSV and discard raw data
2. Store only normalized data
3. Store both raw data and normalized data

### Decision

Chosen option: **store raw and normalized import data**.

### Reason

Raw storage makes the importer auditable. It lets the developer show exactly what the app received from the CSV.

## Decision 14 — Use ImportBatch, ImportRow, and ImportIssue models

### Problem

CSV upload is not a simple one-step operation. It needs staging, issue creation, review, and commit.

### Options considered

1. Import directly into Expense table
2. Store CSV as file only
3. Use staged import tables

### Decision

Chosen option: **staged import tables**.

### Reason

Staging prevents bad data from polluting the ledger. It also supports import reports and user review.

## Decision 15 — Commit only safe rows

### Problem

A CSV can contain both safe and unsafe rows. Blocking the entire import would be frustrating, but committing everything would be wrong.

### Options considered

1. Fail the whole import if any row has an issue
2. Commit all rows and mark questionable ones
3. Commit safe rows and keep risky rows blocked/reviewable

### Decision

Chosen option: **partial safe commit**.

### Reason

This keeps the app useful while still protecting ledger correctness.

Development result for the provided CSV:

```txt
42 total rows
39 issue instances
16 expenses committed on first safe commit
26 rows blocked or not committed
status PARTIALLY_COMMITTED
```

## Decision 16 — Add audit logs

### Problem

The evaluator may ask who uploaded, reviewed, or committed data.

### Options considered

1. Do not track history
2. Store only timestamps on records
3. Add AuditLog for important actions

### Decision

Chosen option: **AuditLog model**.

### Reason

Audit logs prove the app handles financial data deliberately. They also make live explanation easier.

## Decision 17 — Use issue codes instead of only messages

### Problem

Plain text messages are hard to test and filter.

### Options considered

1. Store only human messages
2. Store only booleans like valid/invalid
3. Store structured issue codes

### Decision

Chosen option: **structured issue codes**.

### Reason

Codes such as `UNKNOWN_MEMBER`, `MISSING_PAYER`, and `USD_CONVERTED` are easy to filter, explain, test, and document.

## Decision 18 — Keep frontend demo flow centered on Aisha

### Problem

The assignment needs a clear working demo flow in 2 days.

### Options considered

1. Build full multi-role UI for every member
2. Build only backend APIs and minimal UI
3. Build a complete admin/operator demo flow using Aisha

### Decision

Chosen option: **Aisha-centered demo workflow**.

### Reason

Aisha is the natural operator because she wants the final settlement numbers. The current UI shows the full import/review/commit/balance/audit workflow clearly. Other members still exist for membership validation and balance calculations.

## Decision 19 — Build a premium dashboard UI but keep code explainable

### Problem

A polished UI helps presentation, but a complex UI can become hard to explain.

### Options considered

1. Basic tables only
2. Heavy animations and complex frontend state
3. Polished dashboard with simple API-driven components

### Decision

Chosen option: **polished but explainable dashboard**.

### Reason

The live evaluation values understanding. The frontend is separated into pages, API modules, and reusable components so each piece can be explained.

## Decision 20 — Document AI mistakes honestly

### Problem

The assignment explicitly asks for AI usage and wrong outputs.

### Options considered

1. Hide AI usage
2. Mention only that AI was used
3. Document prompts, mistakes, and corrections

### Decision

Chosen option: **transparent AI usage log**.

### Reason

The evaluator wants to see that the developer remained responsible for the solution. AI was used as a collaborator, not as the engineer of record.

