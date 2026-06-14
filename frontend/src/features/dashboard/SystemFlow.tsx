import {
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileSearch,
  FileUp,
  ShieldCheck,
} from "lucide-react";

const flowSteps = [
  {
    title: "Upload",
    description: "Add the CSV exactly as received. Nothing enters balances yet.",
    icon: FileUp,
    tone: "text-ledger-blue border-ledger-blue/20 bg-ledger-blue/10",
  },
  {
    title: "Check",
    description: "Spot duplicate dinners, missing payers, odd dates, and old members.",
    icon: FileSearch,
    tone: "text-ledger-amber border-ledger-amber/20 bg-ledger-amber/10",
  },
  {
    title: "Understand",
    description: "Read plain-language risk notes before approving money changes.",
    icon: BrainCircuit,
    tone: "text-ledger-violet border-ledger-violet/20 bg-ledger-violet/10",
  },
  {
    title: "Commit",
    description: "Move only valid or approved rows into the real ledger.",
    icon: CheckCircle2,
    tone: "text-ledger-green border-ledger-green/20 bg-ledger-green/10",
  },
  {
    title: "Settle",
    description: "See the smallest set of payments needed to square up.",
    icon: CircleDollarSign,
    tone: "text-ledger-green border-ledger-green/20 bg-ledger-green/10",
  },
  {
    title: "Trace",
    description: "Keep proof of who uploaded, reviewed, skipped, and committed.",
    icon: ShieldCheck,
    tone: "text-ledger-blue border-ledger-blue/20 bg-ledger-blue/10",
  },
];

export function SystemFlow() {
  return (
    <div className="glass-panel rounded-[2rem] p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-ledger-green" />
            <h2 className="font-display text-2xl font-semibold">
              How a row becomes real money
            </h2>
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-ledger-muted">
            The app treats every spreadsheet row as untrusted until it has been
            parsed, checked, reviewed when needed, and committed.
          </p>
        </div>

        <div className="rounded-full border border-ledger-green/20 bg-ledger-green/10 px-4 py-2 text-xs font-medium text-ledger-green">
          Human approval first
        </div>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {flowSteps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div key={step.title} className="relative">
              {index < flowSteps.length - 1 ? (
                <div className="absolute left-[calc(100%-0.5rem)] top-8 hidden h-px w-8 bg-gradient-to-r from-white/20 to-transparent xl:block" />
              ) : null}

              <div className="h-full rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:-translate-y-1 hover:border-ledger-green/20 hover:bg-white/[0.05]">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${step.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <p className="mt-4 font-display text-lg font-semibold">
                  {step.title}
                </p>

                <p className="mt-2 text-sm leading-6 text-ledger-muted">
                  {step.description}
                </p>

                <p className="mt-4 text-xs text-ledger-muted">
                  Step {index + 1}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
