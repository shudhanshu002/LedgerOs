# LedgerOS - Shared Expenses App

LedgerOS is a review-first shared expenses app built for the flatmates assignment. It takes the messy `expenses_export.csv` file exactly as provided, detects the risky rows, asks an admin to approve or skip decisions, and only then commits safe expenses and payments into a relational ledger.

The app is intentionally built around the story in the CSV: Aisha, Rohan, Priya, and Meera shared a flat from February, Dev joined for the Goa trip, Meera moved out after March, and Sam joined in April. That timeline matters because the app should not charge someone for an expense outside their membership period.

## Live App

- Frontend: https://ledger-os-zeta.vercel.app
- Backend API: https://ledgeros-lx4d.onrender.com

Demo login:

```text
Aisha / Password@123
```

The seed command creates the demo users and the assignment workspace:

- Group: `Flatmates Ledger 2026`
- Admin: `Aisha`
- Active core members from 2026-02-01: Aisha, Rohan, Priya
- Meera: joined 2026-02-01, left 2026-03-29
- Dev: joined 2026-02-08, left 2026-03-14 for the trip period
- Sam: joined 2026-04-08

## What The App Does

- Login with JWT authentication.
- Create and manage groups.
- Store membership timelines with join and leave dates.
- Create manual expenses and record payments.
- Import `expenses_export.csv` without editing it first.
- Detect CSV anomalies and show them in a review queue.
- Let an admin approve, skip, reject, keep, or import a row as a settlement.
- Commit reviewed rows into expenses or settlements.
- Calculate balances from committed ledger rows only.
- Show a traceable breakdown for each person's balance.
- Suggest who should pay whom to settle up.
- Record upload, review, commit, expense, and payment actions in the audit trail.

## Stack

- Backend: Django, Django REST Framework, SimpleJWT
- Database: PostgreSQL for deployment, SQLite fallback for local development
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Deployment: Render backend, Vercel frontend, Neon PostgreSQL

## Local Setup

### Backend

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_demo
.\.venv\Scripts\python.exe manage.py runserver
```

`seed_demo` is safe to run more than once. It updates the demo users, makes Aisha the group admin, and reuses an older `Goa Trip 2026` seed group by renaming it to `Flatmates Ledger 2026`.

If `DATABASE_URL` points to a remote database and you want local SQLite for development:

```powershell
$env:DATABASE_URL='sqlite:///db.sqlite3'
.\.venv\Scripts\python.exe manage.py migrate
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend uses `http://127.0.0.1:8000` by default. For deployment or another backend URL, set:

```text
VITE_API_BASE_URL=https://ledgeros-lx4d.onrender.com
```

## Main Demo Flow

1. Login as Aisha.
2. Open Groups and confirm the membership timeline.
3. Open Import Cockpit and upload `backend/expenses_export.csv`.
4. Review anomalies and decide whether to approve, skip, keep, reject, or import as settlement.
5. Commit safe rows.
6. Open Expenses to see committed expenses and payments.
7. Open Balances to see net positions, settlement suggestions, and per-person trace.
8. Open Audit Trail to see evidence of upload, review, and commit actions.

## Deployment Notes

Backend is deployed on Render and frontend is deployed on Vercel.

Render backend environment:

```text
DEBUG=False
DATABASE_URL=<Neon PostgreSQL URL>
ALLOWED_HOSTS=ledgeros-lx4d.onrender.com
CORS_ALLOWED_ORIGINS=https://ledger-os-zeta.vercel.app
USD_TO_INR_RATE=83.00
```

Vercel frontend environment:

```text
VITE_API_BASE_URL=https://ledgeros-lx4d.onrender.com
```

After a fresh Render database migration, run this once in the Render shell:

```bash
python manage.py seed_demo
```

## Important Documents

- `SCOPE.md`: anomaly log, import policy, and schema.
- `DECISIONS.md`: product and engineering decisions.
- `AI_USAGE.md`: AI tools used and mistakes caught.

## Verification

Backend:

```powershell
cd backend
$env:DATABASE_URL='sqlite:///test_local.sqlite3'
.\.venv\Scripts\python.exe manage.py test --noinput
```

Frontend:

```powershell
cd frontend
npm run build
```

Current verified result:

- Backend: 14 tests passing
- Frontend: production build passing
