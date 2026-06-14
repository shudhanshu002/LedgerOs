# Decision Log

This file records the product and engineering decisions I expect to explain in a live review. The main principle was simple: do not let messy spreadsheet data silently become money.

## 1. Review Before Commit

Options considered:

- Import every CSV row immediately and clean later.
- Stop the entire import when the first bad row appears.
- Store the import as a review batch and commit only safe rows.

Decision: store a review batch first, then commit. This protects balances, gives Meera approval control, and still lets valid rows move forward.

## 2. Keep Raw And Normalized Row Data

Options considered:

- Store only cleaned data.
- Store only raw CSV data.
- Store both raw and normalized data.

Decision: store both. Raw data proves what came from the CSV. Normalized data shows what the importer understood. This makes anomalies explainable.

## 3. Settlements Are Not Expenses

Options considered:

- Store repayments as negative expenses.
- Store repayments as one-person expenses.
- Store repayments in a dedicated settlement table.

Decision: use a dedicated `Settlement` model. A payment between two people should reduce balances, but it should not behave like a shared expense with splits.

## 4. Use Integer Paise For Ledger Math

Options considered:

- Store rupees as floats.
- Use decimals everywhere.
- Convert money to integer paise for ledger calculations.

Decision: use integer paise for committed ledger amounts. It avoids floating-point errors and makes rounding easier to test and explain.

## 5. Use A Fixed USD Rate

Options considered:

- Treat USD as INR.
- Fetch live exchange rates.
- Use a configured fixed rate.

Decision: use `USD_TO_INR_RATE`. The assignment is about explainability, not market-rate accuracy. A fixed rate makes old imports reproducible.

## 6. Membership Changes Are Date-Based

Options considered:

- Keep only current members.
- Use a simple many-to-many group membership.
- Store join and leave dates.

Decision: store membership periods. This is required for Sam joining in April, Meera leaving after March, and Dev appearing only around the trip.

## 7. Duplicates Need Human Approval

Options considered:

- Automatically delete duplicates.
- Keep every duplicate.
- Flag duplicates and ask the reviewer.

Decision: flag duplicates and require a decision. The app should not delete or change money rows without approval.

## 8. Support Every Split Type In The CSV

Options considered:

- Implement equal split only.
- Add split types later.
- Implement all split types found in the assignment CSV.

Decision: implement equal, exact/unequal, percentage, and share splits. This keeps the app aligned with the provided data instead of forcing the CSV into one split model.

## 9. Rounding Rule

Options considered:

- Banker's rounding.
- Floor amounts.
- Round half up.

Decision: round half up to paise. It is predictable for users and straightforward to explain when tracing a balance.

## 10. Audit Important Actions

Options considered:

- Rely on database timestamps only.
- Log only import uploads.
- Log uploads, review decisions, commits, manual expenses, and settlements.

Decision: log the important financial actions. This gives the app an evidence trail and helps answer "who approved this?" during review.

## 11. Deterministic AI Review

Options considered:

- Call an external LLM during demo.
- Do not provide explanation text.
- Generate deterministic explanation text from known issue codes.

Decision: use deterministic explanations. It behaves like an AI review layer for the user, but it stays stable and testable during deployment and live evaluation.
