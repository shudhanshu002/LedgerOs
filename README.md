# Shared Expenses App Backend

A Splitwise-inspired shared expenses backend built with Django REST Framework.

This project supports user authentication, group membership timelines, expense splitting, settlements, CSV import, anomaly detection, AI-style import explanations, audit logs, and balance calculation.

## Current Status

Backend is complete and tested locally.

Verified flows:

* JWT login
* Django Admin
* Demo users and membership timeline
* CSV upload
* Import anomaly detection
* Import summary
* AI-style import explanation
* Partial commit of valid rows
* Balance calculation
* Suggested settlements
* Audit log visibility

## Tech Stack

### Backend

* Python
* Django
* Django REST Framework
* Simple JWT
* PostgreSQL-ready through `dj-database-url`
* SQLite fallback for local development
* Google Auth support
* Django Admin

### Database

Relational database only.

Local development can use SQLite. Production/deployment can use Neon PostgreSQL by setting `DATABASE_URL`.

## Main Features

### 1. Authentication

The backend supports JWT authentication.

Main endpoints:

```txt
POST /api/auth/token/
POST /api/auth/token/refresh/
GET  /api/auth/me/
POST /api/auth/google/
```

Demo login:

```txt
username: Aisha
password: Password@123
```

### 2. Groups and Membership Timeline

Users can belong to groups with join and leave dates.

This is important because CSV expenses should not charge users outside their membership period.

Demo group:

```txt
Goa Trip 2026
```

Demo membership timeline:

```txt
Aisha  joined 2026-02-01, active, admin
Rohan  joined 2026-02-01, active
Priya  joined 2026-02-01, active
Meera  joined 2026-02-01, left 2026-03-31
Dev    joined 2026-03-10, active
Sam    joined 2026-04-15, active
```

### 3. Expenses

The backend supports these split types:

```txt
EQUAL
EXACT
PERCENTAGE
SHARE
```

Money is stored internally in paise as integers to avoid floating point errors.

Example:

```txt
₹1200.50 = 120050 paise
```

### 4. Settlements

Settlement rows reduce debt between two users.

A settlement is stored separately from an expense because it should not create a new shared cost.

### 5. CSV Import

CSV upload creates an import report first.

It does not immediately create expenses.

Flow:

```txt
CSV upload
→ ImportBatch
→ ImportRows
→ ImportIssues
→ User review
→ Commit valid rows
→ Expenses/Settlements created
→ Balances updated
```

This prevents bad data from silently affecting balances.

### 6. Import Anomaly Detection

The importer detects issues such as:

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

### 7. AI-Style Import Explanation

The backend includes a deterministic AI-style explainer endpoint.

Endpoint:

```txt
GET /api/ai/imports/{batch_id}/explain/
```

It explains:

* what each anomaly means
* why it is risky
* what action the user should take
* sample affected rows

This is deterministic and does not call an external LLM, so the demo remains reliable.

### 8. Balances

Balances are calculated from committed expenses and settlements.

Endpoint:

```txt
GET /api/expenses/groups/{group_id}/balances/
```

The response includes:

* user balances
* detailed breakdown
* suggested settlements

Example verified result after importing the provided CSV:

```txt
Aisha is owed ₹60,170.99
Rohan owes ₹28,081.00
Priya owes ₹23,823.99
Meera owes ₹9,008.50
Sam is owed ₹742.50
```

## Local Setup

### 1. Create virtual environment

```bash
python -m venv .venv
```

### 2. Activate virtual environment

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Environment variables

Create a `.env` file inside `backend/`.

For local SQLite development:

```env
SECRET_KEY=change-me-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
USD_TO_INR_RATE=83.00
```

For Neon PostgreSQL, also add:

```env
DATABASE_URL=postgresql://username:password@host/dbname?sslmode=require
```

### 5. Run migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Seed demo data

```bash
python manage.py seed_demo
```

### 7. Create admin user

```bash
python manage.py createsuperuser
```

### 8. Run server

```bash
python manage.py runserver
```

Server runs at:

```txt
http://127.0.0.1:8000/
```

Admin runs at:

```txt
http://127.0.0.1:8000/admin/
```

## API Testing Order

Use Postman in this order:

```txt
1. POST /api/auth/token/
2. GET  /api/auth/me/
3. GET  /api/groups/
4. POST /api/imports/upload/
5. GET  /api/imports/{batch_id}/summary/
6. GET  /api/imports/{batch_id}/issues/
7. GET  /api/ai/imports/{batch_id}/explain/
8. POST /api/imports/{batch_id}/commit/
9. GET  /api/expenses/groups/{group_id}/balances/
10. GET /api/audit/
```

## Verified Import Result

For the provided `expenses_export.csv`, the backend produced:

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

This means clean rows were safely committed while risky rows were kept out of balances.

## Important Design Principle

The system never silently imports risky financial data.

Bad or ambiguous CSV rows are first converted into reviewable issues. Only valid or approved rows can affect balances.

## AI Tool Usage

AI was used as a development collaborator for:

* requirement breakdown
* backend architecture
* model design
* CSV anomaly policies
* API design
* documentation drafting
* debugging support

The final implementation decisions were reviewed and tested manually.
