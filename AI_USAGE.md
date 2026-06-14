# AI_USAGE.md — AI Usage Report

## 1. AI tools used

The primary AI tool used during development was ChatGPT.

AI was used as a development collaborator for:

- requirement breakdown
- product interpretation
- database schema review
- backend service planning
- anomaly detection edge cases
- frontend component planning
- README/SCOPE/DECISIONS/AI_USAGE drafting
- testing checklist generation
- live-session preparation

The final implementation decisions and code responsibility remained with the developer.

## 2. How AI was used

AI was not used to blindly generate and submit code. It was used in an iterative workflow:

```txt
1. Explain the requirement
2. Ask AI for a proposed design
3. Review whether the design matches the assignment
4. Ask for implementation steps
5. Read and adapt the generated code
6. Test with the actual CSV
7. Correct wrong assumptions
8. Document decisions and mistakes
```

## 3. Key prompts used

The following are representative prompts used during the project.

### Prompt 1 — Requirement understanding

```txt
Explain this Shared Expenses App assignment in detail. What is it really testing and how should the app be designed?
```

Purpose:

- understand that the core problem is messy data handling, not only Splitwise CRUD
- identify the importance of import staging, issue detection, and audit logs

### Prompt 2 — Backend architecture

```txt
Design a Django REST Framework backend for a shared expenses app with login, groups, membership changes over time, expenses, settlements, CSV import, anomaly detection, and balance calculation.
```

Purpose:

- break backend into models and services
- separate Group, GroupMembership, Expense, ExpenseSplit, Settlement, ImportBatch, ImportRow, ImportIssue, and AuditLog

### Prompt 3 — CSV anomaly detection

```txt
Given this CSV with flatmate expenses, identify all data problems and suggest how an importer should detect and surface them without silently guessing.
```

Purpose:

- create issue codes
- classify anomalies into errors/warnings/review-needed cases
- plan import policies

### Prompt 4 — Membership timeline

```txt
Sam joined mid-April and Meera moved out at the end of March. How should the database and importer prevent them from being charged for wrong dates?
```

Purpose:

- design time-based membership validation
- avoid a simple many-to-many model without dates

### Prompt 5 — Balance calculation

```txt
Explain how to calculate group balances and suggested settlements from committed expenses and settlements using integer paise.
```

Purpose:

- build deterministic balance logic
- prepare for live walkthrough by hand

### Prompt 6 — Frontend workflow

```txt
Build a premium React/Vite frontend flow for this assignment: dashboard, CSV import cockpit, issue review, AI review, balances, and audit trail.
```

Purpose:

- create assignment-aligned frontend pages
- avoid a generic template-looking UI

### Prompt 7 — Testing outline

```txt
Give a full testing outline for the app from login to CSV upload, issue review, commit, balances, audit trail, and deployment.
```

Purpose:

- prepare local testing
- prepare demo video/live session flow

## 4. Cases where AI was wrong and how it was corrected

### Case 1 — AI initially treated the app like a basic Splitwise clone

#### AI output/problem

AI first focused on standard Splitwise features:

- create group
- add expense
- split equally
- show balance

This missed the most important part of the assignment: messy CSV import and anomaly handling.

#### How it was caught

The assignment says:

```txt
A crashed import and a silent guess are both failing answers.
```

It also says the CSV contains deliberate data problems and every problem must be detected, surfaced, and handled by documented policy.

#### Correction made

The architecture was changed to a review-first workflow:

```txt
ImportBatch → ImportRow → ImportIssue → review decision → safe commit → balance calculation
```

This became the central product flow.

### Case 2 — AI suggested a simple group-member many-to-many relation

#### AI output/problem

AI initially suggested storing group members as a normal many-to-many relation.

That would only answer:

```txt
Who is currently in the group?
```

It would not answer:

```txt
Was Sam active on March 15?
Was Meera active on April 2?
```

#### How it was caught

Sam’s requirement directly says:

```txt
I moved in mid-April. Why would March electricity affect my balance?
```

This requires historical membership.

#### Correction made

A `GroupMembership` model with `joined_at` and `left_at` was used.

Validation rule:

```txt
joined_at <= expense_date AND (left_at IS NULL OR expense_date <= left_at)
```

Now membership is evaluated per expense date.

### Case 3 — AI suggested silently skipping duplicate rows

#### AI output/problem

AI initially suggested skipping duplicate rows automatically during import.

This is dangerous because:

- two similar rows may not be true duplicates
- one row may have corrected amount
- user specifically requested approval before deletion/change

#### How it was caught

Meera’s requirement says:

```txt
Clean up the duplicates — but I want to approve anything the app deletes or changes.
```

#### Correction made

Duplicates are not deleted silently. They become `ImportIssue` records:

- `POSSIBLE_DUPLICATE`
- `DUPLICATE_CONFLICT`

The user must review them before action.

### Case 4 — AI initially suggested using floats for money

#### AI output/problem

AI suggested using decimal/float-like values directly in calculations.

This is risky because financial calculations need exact and explainable results.

#### How it was caught

The CSV contains:

```txt
899.995
percentage splits
USD conversion
share splits
```

These require careful rounding and exact totals.

#### Correction made

Money is stored as integer paise.

Example:

```txt
₹1199.00 → 119900 paise
```

Split calculations use deterministic integer logic so the sum of split shares equals the original expense.

### Case 5 — AI initially allowed USD rows to be treated like normal amount values

#### AI output/problem

AI initially focused on parsing numbers but did not strongly separate original currency from ledger currency.

If `540 USD` were treated like `₹540`, Priya’s requirement would fail.

#### How it was caught

Priya says:

```txt
Half the trip was in dollars. The sheet pretends a dollar is a rupee. That can’t be right.
```

#### Correction made

Currency policy was added:

- ledger currency is INR
- USD rows are converted using configured `USD_TO_INR_RATE`
- conversion is surfaced as `USD_CONVERTED`
- original amount/currency are preserved

### Case 6 — AI originally framed the workspace as only Goa Trip

#### AI output/problem

AI referred to the group as `Goa Trip 2026` because several rows involve Goa.

This was incomplete because the CSV includes the full flatmates ledger:

- rent
- groceries
- wifi
- electricity
- maid salary
- deposits
- move-in/move-out expenses
- Goa trip expenses

#### How it was caught

Reviewing the CSV showed that Goa is only one subset of the spreadsheet.

#### Correction made

The workspace should be named:

```txt
Flatmates Ledger 2026
```

The app explanation was updated to describe Goa as a high-risk subset, not the whole group.

### Case 7 — AI suggested AI-like explanations too close to financial logic

#### AI output/problem

AI-generated suggestions initially mixed explanation with decision-making.

This is risky because AI should not decide balances, commit rows, or calculate money.

#### How it was caught

The assignment says the developer is responsible for every line and will be tested on technical decisions.

Financial correctness must be deterministic.

#### Correction made

The AI review layer was kept explanatory only.

Final boundary:

```txt
Deterministic code detects anomalies and calculates balances.
AI-style review explains the anomaly, risk, and suggested action.
AI does not calculate balances or silently modify rows.
```

## 5. What AI helped with successfully

AI was useful for:

- identifying hidden product requirements from the assignment text
- generating a list of possible CSV anomalies
- suggesting a service-layer architecture
- creating a testing checklist
- improving frontend page structure
- drafting documentation
- preparing live-session explanations

## 6. What AI was not trusted with

AI was not trusted to:

- decide final money owed
- silently clean CSV rows
- decide which duplicate row wins
- invent exchange rates dynamically
- decide membership validity without stored dates
- replace actual testing
- replace developer understanding

## 7. Developer responsibility statement

Every AI suggestion was reviewed against the assignment requirements and the actual CSV. When AI output conflicted with the product requirements, the implementation was changed.

The final solution uses AI as a junior collaborator, but the developer remains the engineer of record.

## 8. Example final AI-assisted workflow

```txt
AI suggested possible architecture
→ Developer compared it with assignment text
→ Developer noticed membership timeline requirement
→ Schema was changed to include joined_at/left_at
→ CSV import was tested
→ Issue policies were documented
→ Final app flow was adjusted to import/review/commit/audit
```

## 9. Summary

The most important AI lesson from this project was that a good-looking generated solution can still fail if it ignores messy data, membership history, financial precision, or user approval. The final app was shaped by testing AI suggestions against the assignment, not by accepting AI output directly.
