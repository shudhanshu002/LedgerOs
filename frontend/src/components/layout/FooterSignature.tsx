import {
  BrainCircuit,
  Database,
  GitBranch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function FooterSignature() {
  return (
    <footer className="mt-10 pb-4">
      <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.03] px-5 py-5 backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ledger-green" />

              <p className="font-display text-sm font-semibold text-white">
                LedgerOS - Shared Expenses App
              </p>
            </div>

            <p className="mt-2 max-w-3xl text-xs leading-5 text-ledger-muted">
              Built for the flatmates' real spreadsheet: changing members,
              mixed currencies, duplicate rows, settlements, approvals,
              traceable balances, and clean payback suggestions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-ledger-blue/20 bg-ledger-blue/10 px-3 py-2 text-xs text-ledger-blue">
              <Database className="h-3.5 w-3.5" />
              Django + DRF
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-ledger-green/20 bg-ledger-green/10 px-3 py-2 text-xs text-ledger-green">
              <ShieldCheck className="h-3.5 w-3.5" />
              PostgreSQL-ready
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-ledger-violet/20 bg-ledger-violet/10 px-3 py-2 text-xs text-ledger-violet">
              <BrainCircuit className="h-3.5 w-3.5" />
              Review guidance
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-ledger-muted">
              <GitBranch className="h-3.5 w-3.5" />
              Explainable demo
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
