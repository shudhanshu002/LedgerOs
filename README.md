# LedgerOS — Shared Expenses App

LedgerOS is a shared expenses application built for the **Shared Expenses App** assignment. It is designed for a flatmate group whose spreadsheet contains messy real-world financial data: rent, groceries, utilities, Goa trip expenses, USD payments, duplicate rows, settlements recorded as expenses, and membership changes over time.

The app is not only a Splitwise-style CRUD clone. Its main product idea is a **review-first financial ledger**:

```txt
Messy CSV → safe import → anomaly detection → human review → safe commit → balances → audit trail
```

## Demo context

The assignment scenario contains these people:

- Aisha
- Rohan
- Priya
- Meera
- Dev
- Sam

The main workspace should be treated as:

```txt
Flatmates Ledger 2026
```

The CSV covers shared flatmate expenses from February to April 2026, including:

- February and March rent
- groceries
- wifi bills
- electricity bills
- maid salary
- Goa trip expenses
- USD expenses
- Meera moving out
- Sam moving in
- settlements/payments
- duplicate and inconsistent spreadsheet rows

The earlier name `Goa Trip 2026` was only a subset of the data. The correct domain name is **Flatmates Ledger 2026** because the CSV contains the full flatmates ledger, not only the Goa trip.

## Assignment requirements covered

| Requirement | Implementation |
|---|---|
| Login module | JWT authentication through Django REST Framework and protected frontend routes |
| Create/manage groups | Group and membership models |
| Membership changes over time | `GroupMembership` stores join and leave dates |
| Create/manage expenses | Expense and split models |
| Split types in CSV | Equal, unequal/exact, percentage, and share-based splits |
| Group-wise balances | Balance API and frontend balance page |
| Individual balance summary | Member-level breakdown and net position display |
| Settle debts / record payments | Settlement model and settlement-aware import policy |
| Import `expenses_export.csv` exactly as provided | CSV upload through app; no manual CSV editing required |
| Detect anomalies | Import service creates issue records for bad rows |
| Surface anomalies | Import Cockpit and AI Review pages show detected issues |
| Policy-based handling | Issues are approved, skipped, blocked, or committed according to documented policies |
| Relational DB only | Django ORM with SQLite locally and PostgreSQL/Neon for deployment |
| Import report | Import summary, issue queue, AI review page, and commit result |
| Auditability | Audit trail records uploads, review decisions, and commits |

## Tech stack

### Backend

- Python
- Django
- Django REST Framework
- Simple JWT authentication
- Django ORM
- SQLite for local development
- PostgreSQL / Neon-ready deployment
- Deterministic CSV import and anomaly detection
- Integer paise money storage

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS v4
- React Router
- Axios
- lucide-react
- Responsive dashboard UI

## Core product flow

```txt
1. User logs in
2. User opens Flatmates Ledger 2026
3. User uploads expenses_export.csv
4. Backend parses every row exactly as provided
5. Backend detects anomalies and creates import issues
6. Frontend shows import report and issue queue
7. User reviews risky issues
8. User commits safe rows
9. Backend creates expenses, splits, settlements, and audit logs
10. Balance engine calculates who owes whom
11. User sees group summary, individual breakdown, and settlement suggestions
```

## Demo credentials

Use the seeded demo user:

```txt
Username: Aisha
Password: Password@123
```

Aisha is the recommended demo/admin user because she can run the full import and review workflow.

Other seeded users are available for membership and balance testing:

```txt
Rohan
Priya
Meera
Dev
Sam
```

## Important data model idea

Membership is time-based, not just a simple many-to-many relation.

A member is active for an expense only if:

```txt
joined_at <= expense_date AND (left_at IS NULL OR expense_date <= left_at)
```

This protects cases such as:

- Sam should not pay March expenses because he joined in mid-April.
- Meera can appear in old expenses but should be flagged if included after moving out.
- Dev may be valid for trip expenses but suspicious if used outside the expected trip/member window.

## Local setup

### 1. Clone repository

```bash
git clone https://github.com/shudhanshu002/LedgerOs
cd ledgerOs
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

Windows PowerShell:

```bash
.venv\Scripts\Activate.ps1
```

Windows CMD:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `.env` from example:

```bash
cp .env.example .env
```

Example backend environment:

```env
SECRET_KEY=replace-with-local-secret
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
USD_TO_INR_RATE=83.00
```

For PostgreSQL/Neon deployment, use:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require
```

Run migrations:

```bash
python manage.py makemigrations
python manage.py migrate
```

Seed demo users and the default group:

```bash
python manage.py seed_demo
```

Recommended group rename if your seed still says `Goa Trip 2026`:

```bash
python manage.py shell -c "from apps.groups.models import Group; Group.objects.filter(id=1).update(name='Flatmates Ledger 2026', description='Shared flatmate expenses from Feb-Apr 2026, including rent, groceries, utilities, Goa trip expenses, move-in/move-out changes, settlements, and CSV cleanup.')"
```

Start backend:

```bash
python manage.py runserver
```

Backend local URL:

```txt
http://127.0.0.1:8000
```

### 3. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
```

Create frontend `.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start frontend:

```bash
npm run dev
```

Frontend local URL:

```txt
http://localhost:5173
```

## How to test the app locally

### Step 1: Login

Open:

```txt
http://localhost:5173/login
```

Login as:

```txt
Aisha / Password@123
```

Expected result:

```txt
Redirects to /dashboard
Access and refresh tokens are stored in localStorage
```

### Step 2: Open Dashboard

Open:

```txt
/dashboard
```

Expected sections:

- workspace status bar
- product story
- system flow
- risk matrix
- metrics
- recent activity

### Step 3: Upload CSV

Open:

```txt
/imports
```

Upload:

```txt
expenses_export.csv
```

Expected result:

- import batch is created
- rows are parsed
- issues are created
- import report is displayed
- issue queue shows anomalies

Known import scale from the provided CSV:

```txt
Total rows: 42
Detected issues: 39
First safe commit result observed during development: 16 committed expenses, 0 committed settlements, 26 blocked rows, status PARTIALLY_COMMITTED
```

The exact committed count can vary after repeated imports/commits because already-committed batches should not duplicate ledger entries.

### Step 4: Review issues

In the Import Cockpit, review open issues and apply decisions such as:

- approve / keep row
- skip row
- fix later
- reject
- import as settlement where applicable

Expected result:

- issue status updates
- batch summary refreshes
- audit event is written

### Step 5: Commit safe rows

Click:

```txt
Commit safe rows
```

Expected result:

- safe import rows become Expense / ExpenseSplit records
- settlement-like rows are handled according to policy
- blocked rows remain uncommitted
- commit result appears
- audit log is created

### Step 6: Check balances

Open:

```txt
/balances
```

Expected result:

- net balance per person
- suggested settlements
- individual breakdown

Development result after the original CSV safe commit:

```txt
Aisha: +₹60170.99
Rohan: -₹28081.00
Priya: -₹23823.99
Meera: -₹9008.50
Sam: +₹742.50
```

Suggested settlements observed:

```txt
Rohan → Aisha: ₹28081.00
Priya → Aisha: ₹23823.99
Meera → Aisha: ₹8266.00
Meera → Sam: ₹742.50
```

### Step 7: Check audit trail

Open:

```txt
/audit
```

Expected events:

- import upload
- issue review decision
- import commit

## API overview

Authentication:

```txt
POST /api/auth/token/
POST /api/auth/token/refresh/
GET  /api/auth/me/
```

Groups:

```txt
GET  /api/groups/
POST /api/groups/
GET  /api/groups/{id}/
```

Imports:

```txt
GET  /api/imports/
POST /api/imports/upload/
GET  /api/imports/{batch_id}/
GET  /api/imports/{batch_id}/summary/
GET  /api/imports/{batch_id}/issues/
POST /api/imports/{batch_id}/commit/
POST /api/imports/issues/{issue_id}/decision/
```

AI-style review:

```txt
GET /api/ai/imports/{batch_id}/explain/
```

Expenses and balances:

```txt
GET /api/expenses/
GET /api/expenses/groups/{group_id}/balances/
```

Settlements:

```txt
GET  /api/expenses/settlements/
POST /api/expenses/settlements/
```

Audit:

```txt
GET /api/audit/
```

## Deployment

### Frontend

Recommended: Vercel.

Set environment variable:

```env
VITE_API_BASE_URL=https://<YOUR_BACKEND_URL>
```

Build command:

```bash
npm run build
```

Output directory:

```txt
dist
```

### Backend

Recommended: Render / Railway / Fly.io.

Use PostgreSQL/Neon for the deployed database.

Important backend environment variables:

```env
SECRET_KEY=<production-secret>
DEBUG=False
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require
ALLOWED_HOSTS=<your-backend-host>
CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>
USD_TO_INR_RATE=83.00
```

Run on deploy:

```bash
python manage.py migrate
python manage.py seed_demo
```

## Repository quality

Recommended commit style:

```txt
feat: add JWT authentication
feat: add group membership timeline
feat: add CSV import models
feat: add anomaly detector
feat: add import review decisions
feat: add safe commit service
feat: add balance calculation
feat: add audit trail
feat: build frontend dashboard
feat: build import cockpit
feat: build balance page
feat: build audit trail page
docs: add scope and decision logs
docs: add AI usage report
```

## Known limitations

- The current demo flow is optimized for Aisha as the admin/operator.
- Frontend uses a default demo group/batch for the assignment workflow.
- Full production-grade RBAC UI can be improved by hiding admin-only buttons from normal members.
- Currency conversion uses a fixed deterministic rate for reproducibility, not a live exchange-rate API.
- The AI review layer is deterministic/explainable and is not allowed to calculate balances.

## Why this solution fits the assignment

The assignment is testing whether imperfect financial data is handled deliberately. LedgerOS does that by refusing to silently guess. Every risky row becomes an issue, every issue has a policy, every commit is auditable, and balances are calculated from committed ledger records only.
