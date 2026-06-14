import {
  AlertTriangle,
  CheckCircle2,
  GitCommitHorizontal,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  type ImportSummary,
  formatIssueCode,
  getIssueCodeTone,
} from "./types";

type IssueCodeGridProps = {
  summary?: ImportSummary;
  loading?: boolean;
  committing?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onCommit: () => void;
};

export function IssueCodeGrid({
  summary,
  loading = false,
  committing = false,
  disabled = false,
  disabledReason = "",
  onCommit,
}: IssueCodeGridProps) {
  const issueCodes = summary ? Object.entries(summary.issue_codes) : [];
  const commitDisabled = loading || disabled || committing;
  const valueClassName =
    "mt-3 font-display text-3xl font-semibold text-white";
  const loadingValue = (
    <span className="inline-block h-8 w-14 animate-pulse rounded-xl bg-white/10 align-middle" />
  );

  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-ledger-violet" />

            <h2 className="font-display text-2xl font-semibold">
              Detected issue codes
            </h2>
          </div>

          <p className="mt-1 text-sm leading-6 text-ledger-muted">
            Counts below are all anomalies detected in this batch, including
            issues that are already approved, skipped, or committed.
          </p>
        </div>

        <button
          onClick={onCommit}
          disabled={commitDisabled}
          title={commitDisabled ? disabledReason : ""}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-ledger-bg transition hover:scale-[1.01] disabled:opacity-60"
        >
          <GitCommitHorizontal className="h-4 w-4" />
          {loading
            ? "Loading rows..."
            : committing
              ? "Committing..."
              : disabled
                ? "No safe rows"
                : "Commit safe rows"}
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-ledger-green/20 bg-ledger-green/10 p-5">
          <div className="flex items-center gap-2 text-ledger-green">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium">Valid</p>
          </div>

          <p className={valueClassName}>
            {loading ? loadingValue : summary?.valid_rows ?? 0}
          </p>

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Rows that can safely enter the ledger.
          </p>
        </div>

        <div className="rounded-3xl border border-ledger-amber/20 bg-ledger-amber/10 p-5">
          <div className="flex items-center gap-2 text-ledger-amber">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">Review</p>
          </div>

          <p className={valueClassName}>
            {loading ? loadingValue : summary?.needs_review_rows ?? 0}
          </p>

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Rows requiring operator approval.
          </p>
        </div>

        <div className="rounded-3xl border border-ledger-red/20 bg-ledger-red/10 p-5">
          <div className="flex items-center gap-2 text-ledger-red">
            <ShieldAlert className="h-5 w-5" />
            <p className="font-medium">Blocked</p>
          </div>

          <p className={valueClassName}>
            {loading ? loadingValue : summary?.blocked_rows ?? 0}
          </p>

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Rows prevented from corrupting balances.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {!loading && issueCodes.map(([code, count]) => (
          <div
            key={code}
            className="group rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-ledger-green/20 hover:bg-white/[0.05]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-ledger-muted">
                  {code}
                </p>

                <p className="mt-2 font-display text-lg font-semibold">
                  {formatIssueCode(code)}
                </p>
              </div>

              <div
                className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${getIssueCodeTone(
                  code,
                )}`}
              >
                {count}
              </div>
            </div>
          </div>
        ))}

        {loading ? (
          <>
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                <div className="mt-3 h-5 w-40 animate-pulse rounded-full bg-white/10" />
              </div>
            ))}
          </>
        ) : null}

        {!loading && !issueCodes.length ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-ledger-muted md:col-span-2">
            No issue codes available yet. Upload a CSV to generate anomaly
            analysis.
          </div>
        ) : null}
      </div>
    </div>
  );
}
