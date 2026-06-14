import {
  Boxes,
  CalendarClock,
  FileSpreadsheet,
  RefreshCcw,
} from "lucide-react";
import { type ImportBatch } from "../../types/api";
import { StatusBadge } from "../../components/ui/StatusBadge";

type ImportBatchSwitcherProps = {
  batches: ImportBatch[];
  selectedBatchId: number | null;
  loading?: boolean;
  onSelectBatch: (batchId: number) => void;
  onRefresh: () => void;
};

function getStatusTone(status: string) {
  if (status === "COMMITTED") return "green";
  if (status === "PARTIALLY_COMMITTED") return "amber";
  if (status === "PENDING_REVIEW") return "violet";
  if (status === "FAILED") return "red";
  return "neutral";
}

function getBatchHelper(batch: ImportBatch) {
  const summary = batch.summary;

  if (!summary) {
    return `${batch.total_rows} rows parsed`;
  }

  return `${summary.committed_rows} committed · ${summary.needs_review_rows} review · ${summary.blocked_rows} blocked`;
}

export function ImportBatchSwitcher({
  batches,
  selectedBatchId,
  loading = false,
  onSelectBatch,
  onRefresh,
}: ImportBatchSwitcherProps) {
  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Boxes className="h-5 w-5 text-ledger-green" />

            <h2 className="font-display text-2xl font-semibold">
              Import batches
            </h2>
          </div>

          <p className="mt-1 text-sm text-ledger-muted">
            Switch between uploaded CSV analysis runs.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="rounded-2xl border border-white/10 p-3 text-ledger-muted transition hover:bg-white/5 hover:text-white"
          aria-label="Refresh import batches"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-ledger-muted">
            Loading import batches...
          </div>
        ) : null}

        {!loading && !batches.length ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-ledger-amber/20 bg-ledger-amber/10 p-3 text-ledger-amber">
                <FileSpreadsheet className="h-5 w-5" />
              </div>

              <div>
                <p className="font-display text-lg font-semibold">
                  No batches yet
                </p>
                <p className="mt-2 text-sm leading-6 text-ledger-muted">
                  Upload expenses_export.csv to create a batch. The backend will
                  parse rows, detect anomalies, and generate review status.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {batches.map((batch) => {
          const isSelected = selectedBatchId === batch.id;

          return (
            <button
              key={batch.id}
              onClick={() => onSelectBatch(batch.id)}
              className={`group w-full rounded-3xl border p-4 text-left transition ${
                isSelected
                  ? "border-ledger-green/40 bg-ledger-green/10 shadow-glow"
                  : "border-white/10 bg-white/[0.03] hover:border-ledger-green/20 hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-2xl border p-3 transition ${
                      isSelected
                        ? "border-ledger-green/20 bg-ledger-green/10 text-ledger-green"
                        : "border-white/10 bg-black/20 text-ledger-muted group-hover:text-ledger-green"
                    }`}
                  >
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="font-medium text-white">
                      {batch.display_filename ?? batch.original_filename}
                    </p>

                    <p className="mt-1 text-xs text-ledger-muted">
                      Batch #{batch.id} · {batch.total_rows} rows
                    </p>

                    <p className="mt-2 text-xs text-ledger-muted">
                      {getBatchHelper(batch)}
                    </p>
                  </div>
                </div>

                <StatusBadge tone={getStatusTone(batch.status)}>
                  {batch.status}
                </StatusBadge>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-ledger-muted">
                <CalendarClock className="h-3.5 w-3.5" />
                Selected for review, AI explanation, and safe commit.
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
