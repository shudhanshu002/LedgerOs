import {
  DatabaseZap,
  FileCheck2,
  GitCommitHorizontal,
  LockKeyhole,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";

export function AuditTrustPanel() {
  return (
    <div className="glass-panel ring-gradient rounded-3xl p-6">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-3 text-ledger-green">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold">
              Trust layer
            </h2>

            <p className="mt-1 text-sm text-ledger-muted">
              Auditability is built into the workflow, not added later.
            </p>
          </div>
        </div>

        <StatusBadge tone="green">Append-only evidence</StatusBadge>
      </div>

      <div className="mt-6 rounded-3xl border border-ledger-green/20 bg-ledger-green/10 p-5">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-1 h-5 w-5 text-ledger-green" />

          <div>
            <p className="font-display text-lg font-semibold text-white">
              Why this matters
            </p>

            <p className="mt-2 text-sm leading-7 text-ledger-muted">
              A shared-expense app becomes risky when money changes without a
              clear trail. LedgerOS records who uploaded data, who reviewed
              anomalies, and when safe rows entered the ledger.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-ledger-blue/20 bg-ledger-blue/10 p-3 text-ledger-blue">
              <UploadCloud className="h-5 w-5" />
            </div>

            <div>
              <p className="font-display text-lg font-semibold">
                Upload evidence
              </p>

              <p className="mt-2 text-sm leading-7 text-ledger-muted">
                Proves which CSV created the import batch and who initiated the
                parsing process.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-ledger-violet/20 bg-ledger-violet/10 p-3 text-ledger-violet">
              <FileCheck2 className="h-5 w-5" />
            </div>

            <div>
              <p className="font-display text-lg font-semibold">
                Review evidence
              </p>

              <p className="mt-2 text-sm leading-7 text-ledger-muted">
                Captures issue decisions such as approve, skip row, reject, fix
                later, or import as settlement.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-3 text-ledger-green">
              <GitCommitHorizontal className="h-5 w-5" />
            </div>

            <div>
              <p className="font-display text-lg font-semibold">
                Commit evidence
              </p>

              <p className="mt-2 text-sm leading-7 text-ledger-muted">
                Records when rows were converted into real expenses or
                settlements, making the final balances explainable.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-ledger-amber/20 bg-ledger-amber/10 p-3 text-ledger-amber">
              <DatabaseZap className="h-5 w-5" />
            </div>

            <div>
              <p className="font-display text-lg font-semibold">
                Relational traceability
              </p>

              <p className="mt-2 text-sm leading-7 text-ledger-muted">
                Audit logs reference entities such as import batches, import
                issues, expenses, settlements, and groups instead of hiding data
                inside one large object.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}