import { DatabaseZap } from "lucide-react";

export function AuditTrustPanel() {
  return (
    <div className="glass-panel ring-gradient rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-3 text-ledger-green">
          <DatabaseZap className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-display text-2xl font-semibold">
            Why this matters
          </h2>
          <p className="text-sm text-ledger-muted">
            Financial systems need traceability.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-ledger-muted">
            Upload audit
          </p>
          <p className="mt-3 leading-7 text-ledger-muted">
            Proves who uploaded the CSV, when it was analyzed, and which import
            batch was created.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-ledger-muted">
            Review audit
          </p>
          <p className="mt-3 leading-7 text-ledger-muted">
            Captures the before/after state when an admin approves, rejects,
            skips, or marks an issue for later.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-ledger-muted">
            Commit audit
          </p>
          <p className="mt-3 leading-7 text-ledger-muted">
            Records when safe rows were moved into the real expense ledger.
          </p>
        </div>
      </div>
    </div>
  );
}
