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

Examples of prompts I used:

```text
Analyse the whole project at backend and frontend and see if it is aligned with the shared expenses assignment.
```

```text
Make app properly working step by step.
```

```text
Check all pages and fix data so every page loads live backend data.
```

```text
Explain what approve, skip, and import as settlement should do for CSV issues.
```

```text
Humanise the dashboard and documentation for the flatmates assignment.
```

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
