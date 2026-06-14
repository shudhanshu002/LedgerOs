import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  GitCommitHorizontal,
  ShieldCheck,
  X,
} from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  type ImportCommitResult,
  getImportStatusTone,
} from "./types";

type ImportCommitResultCardProps = {
  result: ImportCommitResult | null;
  onDismiss?: () => void;
};

export function ImportCommitResultCard({
  result,
  onDismiss,
}: ImportCommitResultCardProps) {
  const navigate = useNavigate();

  if (!result) return null;

  const totalCommitted =
    result.committed_expenses + result.committed_settlements;
  const hasErrors = Boolean(result.errors?.length);

  function formatError(
    error: ImportCommitResult["errors"][number],
  ) {
    if (typeof error === "string") {
      return error;
    }

    const rowLabel = error.row_number ? `Row ${error.row_number}: ` : "";

    return `${rowLabel}${error.message ?? "Commit failed for this row."}`;
  }

  return (
    <div className="glass-panel ring-gradient rounded-[2rem] p-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-3 text-ledger-green">
            <GitCommitHorizontal className="h-5 w-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-semibold">
                Commit result
              </h2>

              <StatusBadge tone={getImportStatusTone(result.batch_status)}>
                {result.batch_status ?? "COMMIT_FINISHED"}
              </StatusBadge>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-ledger-muted">
              {totalCommitted > 0
                ? "Backend completed the commit operation. Safe rows entered the ledger, while unsafe or unresolved rows stayed blocked."
                : "Backend completed the commit operation, but no new financial rows were ready to enter the ledger."}
            </p>
          </div>
        </div>

        {onDismiss ? (
          <button
            onClick={onDismiss}
            className="rounded-2xl border border-white/10 p-3 text-ledger-muted transition hover:bg-white/5 hover:text-white"
            aria-label="Dismiss commit result"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-ledger-green/20 bg-ledger-green/10 p-5">
          <div className="flex items-center gap-2 text-ledger-green">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm font-medium">Expenses committed</p>
          </div>

          <p className="mt-3 font-display text-3xl font-semibold text-white">
            {result.committed_expenses}
          </p>

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Created as real expense rows.
          </p>
        </div>

        <div className="rounded-3xl border border-ledger-blue/20 bg-ledger-blue/10 p-5">
          <div className="flex items-center gap-2 text-ledger-blue">
            <CircleDollarSign className="h-5 w-5" />
            <p className="text-sm font-medium">Settlements</p>
          </div>

          <p className="mt-3 font-display text-3xl font-semibold text-white">
            {result.committed_settlements}
          </p>

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Created as payment records.
          </p>
        </div>

        <div className="rounded-3xl border border-ledger-amber/20 bg-ledger-amber/10 p-5">
          <div className="flex items-center gap-2 text-ledger-amber">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">Blocked rows</p>
          </div>

          <p className="mt-3 font-display text-3xl font-semibold text-white">
            {result.blocked_rows}
          </p>

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Stayed out of the ledger.
          </p>
        </div>

        <div className="rounded-3xl border border-ledger-violet/20 bg-ledger-violet/10 p-5">
          <div className="flex items-center gap-2 text-ledger-violet">
            <ShieldCheck className="h-5 w-5" />
            <p className="text-sm font-medium">Total committed</p>
          </div>

          <p className="mt-3 font-display text-3xl font-semibold text-white">
            {totalCommitted}
          </p>

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Financial records created.
          </p>
        </div>
      </div>

      {hasErrors ? (
        <div className="mt-6 rounded-3xl border border-ledger-red/20 bg-ledger-red/10 p-5">
          <div className="flex items-center gap-2 text-ledger-red">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">Commit errors</p>
          </div>

          <div className="mt-3 space-y-2">
            {result.errors.map((error, index) => (
              <p key={index} className="text-sm leading-6 text-ledger-muted">
                {formatError(error)}
              </p>
            ))}
          </div>
        </div>
      ) : totalCommitted > 0 ? (
        <div className="mt-6 rounded-3xl border border-ledger-green/20 bg-ledger-green/10 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 text-ledger-green" />

            <p className="text-sm leading-7 text-ledger-muted">
              No commit errors were returned. You can now inspect updated group
              balances and audit evidence.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-ledger-amber/20 bg-ledger-amber/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 text-ledger-amber" />

            <p className="text-sm leading-7 text-ledger-muted">
              No safe rows were committed. Review or skip the remaining open
              issues, then commit again when the valid row count is above zero.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate("/balances")}
          className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-ledger-bg transition hover:scale-[1.01]"
        >
          View balances
          <ArrowRight className="h-4 w-4" />
        </button>

        <button
          onClick={() => navigate("/audit")}
          className="flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-ledger-muted transition hover:bg-white/5 hover:text-white"
        >
          View audit trail
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
