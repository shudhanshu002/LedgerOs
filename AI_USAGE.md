# AI Usage

I used AI as a development collaborator, not as a replacement for understanding the code. I still read the generated code, ran the app, checked failures, and made the final decisions.

## Tools Used

- ChatGPT: primary development collaborator for planning, implementation help, debugging, copy review, and deployment guidance.
- Claude: secondary assistant for occasional second opinions on wording, product explanation, and edge-case thinking.
- diagrams.net/draw.io: used to plan and communicate the relational database structure.

## How ChatGPT Helped

- Broke down the assignment into product requirements and engineering tasks.
- Reviewed backend and frontend alignment with the CSV story.
- Helped implement and debug the import review flow.
- Helped trace why groups, imports, balances, and audit pages were not always loading live data.
- Helped improve loading states, dashboard wording, and deployment configuration.
- Helped write and refine README, scope, decision, and AI usage documentation.

## How Claude Helped

- Used as a secondary reviewer for human-readable explanation style.
- Helped sanity-check whether some product wording sounded too technical.
- Helped think through how to explain anomalies and reviewer decisions clearly.

## How diagrams.net/draw.io Helped

I used diagrams.net/draw.io to sketch the relational structure before finalizing the model relationships. The important model groups were:

- users, groups, and memberships
- expenses and expense splits
- settlements
- import batches, rows, issues, and decisions
- audit logs

This helped keep the backend relational instead of turning the CSV import into unstructured JSON-only storage.

## Key Prompts

## Examples of Prompts I Used

Instead of using AI only for generating code, I used it to challenge my product decisions, database design, import policy, balance calculation, and frontend data-loading strategy. Some of the more useful prompts were:

```text
Act as a senior backend engineer reviewing a shared-expense ledger system. The app imports a messy CSV before creating real expenses. Review the proposed flow: CSV row → ImportBatch → ImportRow → ImportIssue → review decision → committed Expense/Split/Settlement → balance calculation → audit log. Tell me what can go wrong if rows are committed directly without a review layer.
```

```text
Design a relational database schema for a Splitwise-inspired app where group membership changes over time. A member may join or leave on specific dates, and expense validation must check whether the member was active on the expense date. Compare a simple many-to-many group-members table with a GroupMembership table containing joined_at and left_at.
```

```text
Given a flatmates expenses CSV with rent, groceries, utilities, Goa trip expenses, USD rows, duplicate rows, missing payer, missing currency, inactive members, settlement rows, negative amounts, zero amounts, and invalid percentage splits, define an anomaly-detection policy. For each anomaly, classify it as safe, needs review, or blocked, and explain whether it should be auto-fixed, reviewed by a user, or rejected.
```

```text
Review my balance-calculation approach for a shared expense ledger. For every committed expense, the payer should receive credit and every participant should be debited by their split share. Final balance should be paid minus owed, with settlements applied separately. Explain edge cases around rounding, percentage splits, share-based splits, refunds, and settlement rows.
```

```text
Explain how to generate settlement suggestions from final user balances. Positive balances mean users should receive money and negative balances mean users owe money. Design a simple greedy settlement algorithm and explain why it reduces the number of payments while preserving the same net balance.
```

```text
Review the import workflow from a product-management perspective. Aisha wants final who-pays-whom numbers, Rohan wants expense-level traceability, Priya wants USD handled correctly, Sam should not be charged before joining, and Meera wants approval before duplicates are removed. Tell me how these user requests should influence the importer, UI, database, and audit trail.
```

```text
Design the frontend page-loading strategy for this app. The dashboard needs summary data, the import page needs batches and issues, the AI review page needs an import report, the balances page needs group balance data, and the audit page needs event logs. Suggest how to keep each page fast by loading only the data it needs, using page-level loading states, avoiding unnecessary repeated API calls, and keeping large issue lists separate from dashboard metrics.
```

```text
Review the API boundary for this project. Which endpoints should be read-only for normal group members, and which actions should be admin-only? Consider CSV upload, issue review, import commit, group membership updates, settlement creation, balance viewing, and audit log viewing.
```

```text
Act as an interviewer in the 45-minute live evaluation. Pick one anomaly from the CSV, such as USD_CONVERTED, INACTIVE_MEMBER, DUPLICATE_CONFLICT, SETTLEMENT_AS_EXPENSE, or INVALID_PERCENTAGE_TOTAL, and ask me to trace where it is detected, how it is stored, how it appears in the UI, and what happens during commit.
```

```text
Review the documentation for this assignment. Make sure README.md explains setup and demo flow, SCOPE.md documents all anomalies and the database schema, DECISIONS.md explains tradeoffs and alternatives, and AI_USAGE.md honestly explains how AI helped, where it was wrong, and how I corrected it.
```

```text
Check whether the app is too demo-hardcoded around one group. The CSV is not only a Goa trip; it includes the full flatmates ledger from February to April. Suggest a better product framing and explain whether this should be modeled as one evolving group or multiple groups.
```

```text
Help me prepare for a live code walkthrough. Explain how I should describe the full lifecycle of one CSV row: parsing, normalization, anomaly detection, review decision, commit eligibility, expense creation, split creation, balance impact, and audit logging.
```

These prompts helped me use AI as a reviewer and design partner rather than just a code generator. I used the responses to check my own understanding, compare options, and then made the final implementation decisions myself.


## AI Mistakes Caught And Fixed

1. Test discovery was wrong at first.

   AI assumed backend tests were being discovered, but `manage.py test` initially ran zero useful tests. I verified the command output, found the test discovery issue, fixed the test package structure, and reran the tests.

2. Frontend pages looked live but still had hardcoded assumptions.

   Some pages were using fixed group or batch assumptions. I checked the API calls, found the hardcoded behavior, and changed pages to use the active group and latest relevant import batch.

3. Review decisions did not fully update row state.

   The UI could approve or skip issues, but rows with multiple open issues still did not become valid. I traced the backend decision flow and updated the logic so row-level actions close related open issues where appropriate.

4. A Postgres locking bug appeared during approve.

   The approve endpoint hit a `FOR UPDATE` error on Postgres because of how related rows were selected. I read the error, traced the query, and changed the locking to target the issue row and lock the import row separately.

5. Some generated UI copy was too technical.

   AI-generated text initially sounded like an architecture pitch. I rewrote the dashboard and docs around the actual flatmates story: who paid, who moved, who visited, what was duplicated, and what still needs review.

6. Deployment guidance missed a server package.

   The backend deployed to Render but failed because `gunicorn` was not installed. I caught this from the Render logs and added the package requirement before redeploying.

## Engineer Responsibility

I treated AI output as a draft. I checked the code paths, ran verification commands, tested the UI behavior, and made the final product decisions.

Current verification:

- Django tests: 14 passing
- Frontend production build: passing
