# Decision Log

This file records the product and engineering decisions behind LedgerOS. I wrote it so I can explain the project in a live review without hiding behind the UI.

The guiding principle: money should never change silently.

## 1. Review Batch Before Ledger Commit

Options considered:

- Import every CSV row immediately.
- Stop the whole import on the first bad row.
- Store a review batch, then commit only safe rows.

Decision: store `ImportBatch`, `ImportRow`, and `ImportIssue` first. Commit happens later. This gives Meera approval control and prevents bad spreadsheet rows from corrupting balances.

## 2. Preserve Raw And Normalized CSV Rows

Options considered:

- Store only raw CSV.
- Store only cleaned values.
- Store both raw and normalized values.

Decision: store both. Raw data proves what was uploaded; normalized data shows what the app interpreted. This makes row-level tracing possible.

## 3. Model Settlements Separately

Options considered:

- Negative expense.
- One-person expense.
- Dedicated settlement table.

Decision: use `Settlement`. A repayment is a direct transfer between two people. It should affect balances but should not create expense splits.

## 4. Use Integer Paise For Money

Options considered:

- Floating point rupees.
- Decimal values throughout all calculations.
- Integer paise in committed ledger math.

Decision: convert committed amounts to integer paise. It avoids floating-point drift and makes balance traces exact.

## 5. Fixed USD Conversion Rate

Options considered:

- Treat USD as INR.
- Fetch live exchange rates.
- Use a configured fixed rate.

Decision: use `USD_TO_INR_RATE`. The assignment tests explainability and repeatability. A fixed rate is easier to audit than a changing market rate.

## 6. Date-Aware Membership

Options considered:

- Store only current members.
- Use a basic many-to-many table.
- Store membership periods.

Decision: use `GroupMembership` with `joined_at` and `left_at`. This directly answers Sam's requirement and protects historical balances.

## 7. Duplicate Rows Require Human Decision

Options considered:

- Automatically delete duplicates.
- Keep all duplicates.
- Detect duplicates and ask.

Decision: detect and surface duplicates. The app can recommend, but the reviewer decides whether to keep or skip.

## 8. Support CSV Split Types Explicitly

Options considered:

- Equal split only.
- Add split types later.
- Implement every split type in the assignment CSV.

Decision: implement equal, exact/unequal, percentage, and share splits. A CSV import app should respect the source data instead of forcing everything into equal splits.

## 9. Rounding Policy

Options considered:

- Floor values.
- Banker's rounding.
- Round half up to paise.

Decision: round half up. It is predictable for users and straightforward to explain when a split has remainders.

## 10. Audit Trail

Options considered:

- Rely on model timestamps.
- Log only uploads.
- Log uploads, review decisions, commits, manual expenses, and settlements.

Decision: record important financial actions in `AuditLog`. The reviewer should be able to ask who uploaded, who approved, and when a commit happened.

## 11. Deterministic AI Review Layer

Options considered:

- Call an external LLM during demo.
- Avoid explanation text.
- Generate deterministic explanations from issue codes.

Decision: use deterministic AI-style explanations. This gives a helpful review layer without risking live LLM latency, cost, or non-repeatable output during evaluation.

## 12. Keep UI Fast With Cached Data And Background Sync

Options considered:

- Always block pages until fresh API data loads.
- Show stale data forever.
- Show cached data immediately, then sync in the background.

Decision: use short-lived page caching. Render/Neon can be slow on first response, so cached data keeps the app usable while the backend refreshes.

## 13. Vercel SPA Rewrite

Options considered:

- Use hash routing.
- Let Vercel return 404 for deep links.
- Configure Vercel to serve `index.html` for frontend paths.

Decision: add `frontend/vercel.json` rewrite. React Router should handle app routes and custom not-found pages.

## 14. Demo Data Over Generic Sample Data

Options considered:

- Use generic users and fake expenses.
- Seed only users.
- Seed the assignment group, timeline, and CSV-ready workspace.

Decision: seed the real assignment story. It makes the app easier to evaluate because every screen maps back to the provided scenario.
