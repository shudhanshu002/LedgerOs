import {
  AlertTriangle,
  BadgeCheck,
  Bug,
  FileWarning,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  type ImportSummary,
  getRiskLevel,
  getTopIssueCodes,
} from "./types";

type RiskMatrixProps = {
  summary?: ImportSummary;
  issueCount?: number;
  loading?: boolean;
};

function LoadingNumber() {
  return (
    <div className="mt-4 h-9 w-16 animate-pulse rounded-xl bg-white/10" />
  );
}

export function RiskMatrix({
  summary,
  issueCount = 0,
  loading = false,
}: RiskMatrixProps) {
  const risk = getRiskLevel(summary);
  const topIssueCodes = getTopIssueCodes(summary);

  return (
    <div className="glass-panel ring-gradient rounded-[2rem] p-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-ledger-red/20 bg-ledger-red/10 p-3 text-ledger-red">
            <ShieldAlert className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold">
              Import risk matrix
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-ledger-muted">
              The dashboard summarizes import safety before any reviewer moves
              to commit. This makes the product feel like a financial operations
              system, not only a basic expense splitter.
            </p>
          </div>
        </div>

        <StatusBadge tone={loading ? "neutral" : risk.tone}>
          {loading ? "Loading" : risk.label}
        </StatusBadge>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-ledger-green" />

          <div>
            <p className="font-display text-lg font-semibold">
              Current batch assessment
            </p>

            <p className="mt-2 text-sm leading-7 text-ledger-muted">
              {loading
                ? "Loading the latest import batch and anomaly report."
                : risk.description}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-ledger-green/20 bg-ledger-green/10 p-5">
          <div className="flex items-center gap-2 text-ledger-green">
            <BadgeCheck className="h-5 w-5" />
            <p className="text-sm font-medium">Valid rows</p>
          </div>

          {loading ? (
            <LoadingNumber />
          ) : (
            <p className="mt-3 font-display text-3xl font-semibold text-white">
              {summary?.valid_rows ?? 0}
            </p>
          )}

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Ready to enter ledger.
          </p>
        </div>

        <div className="rounded-3xl border border-ledger-amber/20 bg-ledger-amber/10 p-5">
          <div className="flex items-center gap-2 text-ledger-amber">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">Review rows</p>
          </div>

          {loading ? (
            <LoadingNumber />
          ) : (
            <p className="mt-3 font-display text-3xl font-semibold text-white">
              {summary?.needs_review_rows ?? 0}
            </p>
          )}

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Need operator decision.
          </p>
        </div>

        <div className="rounded-3xl border border-ledger-red/20 bg-ledger-red/10 p-5">
          <div className="flex items-center gap-2 text-ledger-red">
            <FileWarning className="h-5 w-5" />
            <p className="text-sm font-medium">Blocked rows</p>
          </div>

          {loading ? (
            <LoadingNumber />
          ) : (
            <p className="mt-3 font-display text-3xl font-semibold text-white">
              {summary?.blocked_rows ?? 0}
            </p>
          )}

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Prevented from import.
          </p>
        </div>

        <div className="rounded-3xl border border-ledger-violet/20 bg-ledger-violet/10 p-5">
          <div className="flex items-center gap-2 text-ledger-violet">
            <Bug className="h-5 w-5" />
            <p className="text-sm font-medium">Issue count</p>
          </div>

          {loading ? (
            <LoadingNumber />
          ) : (
            <p className="mt-3 font-display text-3xl font-semibold text-white">
              {issueCount}
            </p>
          )}

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Total detected anomalies.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.24em] text-ledger-muted">
          Top risk drivers
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {loading ? (
            <>
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]"
                />
              ))}
            </>
          ) : null}

          {!loading && topIssueCodes.map(([code, count]) => (
            <div
              key={code}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-white">{code}</p>

                <span className="rounded-2xl border border-ledger-amber/20 bg-ledger-amber/10 px-3 py-2 text-sm font-semibold text-ledger-amber">
                  {count}
                </span>
              </div>
            </div>
          ))}

          {!loading && !topIssueCodes.length ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-ledger-muted md:col-span-2">
              No issue codes available yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
