import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  FileSpreadsheet,
  FileWarning,
  RefreshCcw,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import { api } from "../../lib/api";
import { ImportBatch, ImportIssue } from "../../types/api";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusBadge } from "../../components/ui/StatusBadge";

function getSeverityTone(severity: ImportIssue["severity"]) {
  if (severity === "ERROR") return "red";
  if (severity === "WARNING") return "amber";
  return "blue";
}

function getStatusTone(status: string) {
  if (status === "COMMITTED") return "green";
  if (status === "PARTIALLY_COMMITTED") return "amber";
  if (status === "PENDING_REVIEW") return "violet";
  if (status === "FAILED") return "red";
  return "neutral";
}

function formatDateTime(value: string | null) {
  if (!value) return "Not reviewed";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ImportCockpitPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [message, setMessage] = useState("");

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  async function loadBatches() {
    const response = await api.get<ImportBatch[]>("/api/imports/");
    setBatches(response.data);

    if (!selectedBatchId && response.data.length > 0) {
      setSelectedBatchId(response.data[0].id);
    }

    return response.data;
  }

  async function loadIssues(batchId: number) {
    const response = await api.get<ImportIssue[]>(
      `/api/imports/${batchId}/issues/`,
    );

    setIssues(response.data);
  }

  async function refreshAll() {
    setLoading(true);

    try {
      const loadedBatches = await loadBatches();
      const batchId = selectedBatchId ?? loadedBatches[0]?.id;

      if (batchId) {
        await loadIssues(batchId);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      loadIssues(selectedBatchId).catch(console.error);
    }
  }, [selectedBatchId]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setMessage("");
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setMessage("Select expenses_export.csv first.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("group_id", "1");
      formData.append("file", selectedFile);

      const response = await api.post<ImportBatch>(
        "/api/imports/upload/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setSelectedBatchId(response.data.id);
      setMessage(`Uploaded ${response.data.original_filename} successfully.`);

      await refreshAll();
    } catch {
      setMessage("CSV upload failed. Check backend server and token.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCommit() {
    if (!selectedBatchId) return;

    setCommitting(true);
    setMessage("");

    try {
      const response = await api.post(
        `/api/imports/${selectedBatchId}/commit/`,
      );

      setMessage(
        `Commit finished: ${response.data.committed_expenses} expenses committed, ${response.data.blocked_rows} rows blocked.`,
      );

      await refreshAll();
    } catch {
      setMessage("Commit failed. Some issues may still need review.");
    } finally {
      setCommitting(false);
    }
  }

  const summary = selectedBatch?.summary;

  return (
    <section className="py-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-ledger-green">
            Import Cockpit
          </p>

          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
            Review data before it touches money.
          </h1>

          <p className="mt-4 max-w-3xl text-ledger-muted">
            Upload the assignment CSV, inspect detected anomalies, and commit
            only safe rows into the ledger. Risky rows remain blocked or under
            review.
          </p>
        </div>

        {selectedBatch ? (
          <StatusBadge tone={getStatusTone(selectedBatch.status)}>
            {selectedBatch.status}
          </StatusBadge>
        ) : null}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total rows"
          value={summary?.total_rows ?? 0}
          helper="Rows parsed from CSV"
          icon={FileSpreadsheet}
          tone="blue"
        />

        <MetricCard
          label="Committed"
          value={summary?.committed_rows ?? 0}
          helper="Rows already added to ledger"
          icon={CheckCircle2}
          tone="green"
        />

        <MetricCard
          label="Needs review"
          value={summary?.needs_review_rows ?? 0}
          helper="Warning/info rows awaiting decision"
          icon={AlertTriangle}
          tone="amber"
        />

        <MetricCard
          label="Blocked"
          value={summary?.blocked_rows ?? 0}
          helper="Error rows prevented from import"
          icon={ShieldAlert}
          tone="red"
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="glass-panel ring-gradient rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-3 text-ledger-green">
                <UploadCloud className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-display text-2xl font-semibold">
                  Upload CSV
                </h2>
                <p className="text-sm text-ledger-muted">
                  Uses group_id 1: Goa Trip 2026
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-5">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full cursor-pointer rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-ledger-muted file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ledger-bg"
              />

              <p className="mt-3 text-xs leading-5 text-ledger-muted">
                Select the provided <span className="text-white">expenses_export.csv</span>.
                Upload creates an import report first; it does not directly
                create expenses.
              </p>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-ledger-bg transition hover:scale-[1.01] disabled:opacity-60"
            >
              <UploadCloud className="h-4 w-4" />
              {uploading ? "Analyzing CSV..." : "Upload and Analyze"}
            </button>

            {message ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-ledger-muted">
                {message}
              </div>
            ) : null}
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold">
                  Import batches
                </h2>
                <p className="mt-1 text-sm text-ledger-muted">
                  Select a batch to inspect issues.
                </p>
              </div>

              <button
                onClick={() => refreshAll().catch(console.error)}
                className="rounded-2xl border border-white/10 p-3 text-ledger-muted transition hover:bg-white/5 hover:text-white"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`w-full rounded-3xl border p-4 text-left transition ${
                    selectedBatchId === batch.id
                      ? "border-ledger-green/40 bg-ledger-green/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{batch.original_filename}</p>
                      <p className="mt-1 text-xs text-ledger-muted">
                        Batch #{batch.id} · {batch.total_rows} rows
                      </p>
                    </div>

                    <StatusBadge tone={getStatusTone(batch.status)}>
                      {batch.status}
                    </StatusBadge>
                  </div>
                </button>
              ))}

              {!batches.length && !loading ? (
                <p className="text-sm text-ledger-muted">
                  No import batches yet. Upload a CSV to begin.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="font-display text-2xl font-semibold">
                  Detected issue codes
                </h2>
                <p className="mt-1 text-sm text-ledger-muted">
                  High-signal summary generated by backend anomaly policies.
                </p>
              </div>

              <button
                onClick={handleCommit}
                disabled={!selectedBatchId || committing}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-ledger-bg transition hover:scale-[1.01] disabled:opacity-60"
              >
                {committing ? "Committing..." : "Commit safe rows"}
              </button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {summary
                ? Object.entries(summary.issue_codes).map(([code, count]) => (
                    <div
                      key={code}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <span className="text-sm text-ledger-muted">{code}</span>
                      <span className="font-display text-lg font-semibold">
                        {count}
                      </span>
                    </div>
                  ))
                : null}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <FileWarning className="h-5 w-5 text-ledger-red" />
              <h2 className="font-display text-2xl font-semibold">
                Review queue
              </h2>
            </div>

            <div className="mt-5 max-h-[680px] space-y-3 overflow-y-auto pr-1">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={getSeverityTone(issue.severity)}>
                          {issue.severity}
                        </StatusBadge>

                        <StatusBadge tone="neutral">
                          {issue.status}
                        </StatusBadge>

                        <span className="text-xs text-ledger-muted">
                          Issue #{issue.id}
                        </span>
                      </div>

                      <h3 className="mt-3 font-display text-lg font-semibold">
                        {issue.code}
                      </h3>
                    </div>

                    <div className="text-right text-xs text-ledger-muted">
                      {formatDateTime(issue.reviewed_at)}
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-ledger-muted">
                    {issue.message}
                  </p>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-ledger-muted">
                      Suggested action
                    </p>
                    <p className="mt-2 text-sm">{issue.suggested_action}</p>
                  </div>
                </div>
              ))}

              {!issues.length ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-ledger-muted">
                  No issues found for this batch.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}