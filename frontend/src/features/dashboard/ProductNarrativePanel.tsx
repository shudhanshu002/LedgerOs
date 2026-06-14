import {
  BrainCircuit,
  FileSearch,
  GitCommitHorizontal,
  Layers3,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";

const productHighlights = [
  {
    title: "One clear answer",
    description:
      "Aisha can open balances and see the simple version: who pays whom, how much, and why.",
    icon: ShieldCheck,
    tone: "border-ledger-green/20 bg-ledger-green/10 text-ledger-green",
  },
  {
    title: "Messy rows stay visible",
    description:
      "Duplicate dinners, missing payers, bad dates, and inactive members become review cards instead of silent guesses.",
    icon: FileSearch,
    tone: "border-ledger-amber/20 bg-ledger-amber/10 text-ledger-amber",
  },
  {
    title: "No magic numbers",
    description:
      "Rohan can trace each balance back to the exact expense, split, payment, or skipped row that caused it.",
    icon: BrainCircuit,
    tone: "border-ledger-violet/20 bg-ledger-violet/10 text-ledger-violet",
  },
  {
    title: "People move in and out",
    description:
      "Meera and Sam are handled by dates, so March electricity does not suddenly become Sam's problem.",
    icon: Layers3,
    tone: "border-ledger-blue/20 bg-ledger-blue/10 text-ledger-blue",
  },
];

const assignmentMapping = [
  {
    label: "Login",
    value: "Aisha signs in as group admin",
    icon: ShieldCheck,
  },
  {
    label: "Groups",
    value: "Set join and leave dates",
    icon: Users,
  },
  {
    label: "Expenses",
    value: "Create expenses and payments",
    icon: ReceiptText,
  },
  {
    label: "Balances",
    value: "See who pays whom",
    icon: GitCommitHorizontal,
  },
];

export function ProductNarrativePanel() {
  return (
    <div className="glass-panel ring-gradient rounded-[2rem] p-6">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-3 text-ledger-green">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold">
                What this app is doing
              </h2>

              <p className="mt-1 text-sm text-ledger-muted">
                A practical ledger for one messy flatmate spreadsheet.
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-4xl text-sm leading-7 text-ledger-muted">
            The spreadsheet has rent, groceries, Goa trip spending, USD rows,
            refunds, duplicate dinners, a payback typed as an expense, and
            changing flatmates. This app slows that down into a safe workflow:
            import the CSV, review the risky rows, commit only approved money
            movements, then show balances and settlement suggestions everyone
            can understand.
          </p>
        </div>

        <StatusBadge tone="green">Working with live ledger data</StatusBadge>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {productHighlights.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-ledger-green/20 hover:bg-white/[0.05]"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${item.tone}`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <p className="mt-4 font-display text-lg font-semibold">
                {item.title}
              </p>

              <p className="mt-2 text-sm leading-6 text-ledger-muted">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-ledger-muted">
          Where to go next
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {assignmentMapping.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-center gap-2 text-ledger-green">
                  <Icon className="h-4 w-4" />
                  <p className="text-sm font-medium">{item.label}</p>
                </div>

                <p className="mt-2 text-sm text-ledger-muted">{item.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
