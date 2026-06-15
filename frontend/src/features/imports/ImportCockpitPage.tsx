import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  ShieldAlert,
} from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { resolveActiveGroupId } from "../../lib/activeGroup";
import { getPageCache, setPageCache } from "../../lib/pageCache";
import { getGroups } from "../groups/groupsApi";
import { ImportBatchSwitcher } from "./ImportBatchSwitcher";
import { ImportCommitResultCard } from "./ImportCommitResultCard";
import { ImportPolicyStrip } from "./ImportPolicyStrip";
import {
  commitImportBatch,
  getImportBatches,
  getImportIssues,
  getImportReport,
} from "./importsApi";
import { IssueCodeGrid } from "./IssueCodeGrid";
import { IssueQueue } from "./IssueQueue";
import { UploadCsvCard } from "./UploadCsvCard";
import type { ImportBatch, ImportCommitResult, ImportIssue } from "./types";

type ImportCockpitPageCache = {
  batches: ImportBatch[];
  selectedBatchId: number | null;
  activeGroupId: number | null;
  issues: ImportIssue[];
};

const IMPORT_COCKPIT_CACHE_KEY = "import-cockpit-page";

function getStatusTone(status: string) {
  if (status === "COMMITTED") return "green";
  if (status === "PARTIALLY_COMMITTED") return "amber";
  if (status === "PENDING_REVIEW") return "violet";
  if (status === "FAILED") return "red";
  return "neutral";
}

export function ImportCockpitPage() {
  usePageTitle("Import Cockpit");

  const cachedPage =
    getPageCache<ImportCockpitPageCache>(IMPORT_COCKPIT_CACHE_KEY);
  const [batches, setBatches] = useState<ImportBatch[]>(
    cachedPage?.batches ?? [],
  );
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(
    cachedPage?.selectedBatchId ?? null,
  );
  const [activeGroupId, setActiveGroupId] = useState<number | null>(
    cachedPage?.activeGroupId ?? null,
  );
  const [issues, setIssues] = useState<ImportIssue[]>(
    cachedPage?.issues ?? [],
  );

  const [loading, setLoading] = useState(!cachedPage);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [message, setMessage] = useState("");
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(
    null,
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  async function loadBatches() {
    const data = await getImportBatches();
    setBatches(data);

    if (!selectedBatchId && data.length > 0) {
      setSelectedBatchId(data[0].id);
    }

    return data;
  }

  async function loadIssues(batchId: number) {
    setIssuesLoading(true);

    try {
      const data = await getImportIssues(batchId);
      setIssues(data);
      setPageCache<ImportCockpitPageCache>(IMPORT_COCKPIT_CACHE_KEY, {
        batches,
        selectedBatchId: batchId,
        activeGroupId,
        issues: data,
      });
    } finally {
      setIssuesLoading(false);
    }
  }

  async function refreshAll({
    showLoading = true,
    preferredBatchId = selectedBatchId,
  }: {
    showLoading?: boolean;
    preferredBatchId?: number | null;
  } = {}) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [groups, loadedBatches] = await Promise.all([
        getGroups(),
        getImportBatches(),
      ]);
      const resolvedGroupId = resolveActiveGroupId(groups, activeGroupId);

      setBatches(loadedBatches);
      setActiveGroupId(resolvedGroupId);

      const batchId =
        loadedBatches.find((batch) => batch.id === preferredBatchId)?.id ??
        loadedBatches[0]?.id;
      let loadedIssues: ImportIssue[] = [];

      if (batchId) {
        setSelectedBatchId(batchId);
        loadedIssues = await getImportIssues(batchId);
        setIssues(loadedIssues);
      } else {
        setSelectedBatchId(null);
        setIssues([]);
      }

      setPageCache<ImportCockpitPageCache>(IMPORT_COCKPIT_CACHE_KEY, {
        batches: loadedBatches,
        selectedBatchId: batchId ?? null,
        activeGroupId: resolvedGroupId,
        issues: loadedIssues,
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    refreshAll({ showLoading: !cachedPage }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      loadIssues(selectedBatchId).catch(console.error);
    }
  }, [selectedBatchId]);

  async function handleCommit() {
    if (!selectedBatchId) return;

    setCommitResult(null);
    setCommitting(true);
    setMessage("");

    try {
      const data = await commitImportBatch(selectedBatchId);
      const totalCommitted =
        data.committed_expenses + data.committed_settlements;

      if (totalCommitted > 0) {
        setMessage(
          `Commit finished: ${data.committed_expenses} expenses and ${data.committed_settlements} settlements committed.`,
        );
      } else {
        setMessage(
          "Commit finished, but no new rows were ready. Review remaining issues or check the commit result below.",
        );
      }

      setCommitResult(data);

      await refreshAll({ showLoading: false });
    } catch (error) {
      console.error(error);
      setMessage("Commit failed. Some issues may still need review.");
    } finally {
      setCommitting(false);
    }
  }

  const summary = selectedBatch?.summary;
  const safeRows = summary?.valid_rows ?? 0;

  async function handleDownloadReport() {
    if (!selectedBatchId) return;

    try {
      const report = await getImportReport(selectedBatchId);
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `ledgeros-import-report-batch-${selectedBatchId}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Import report downloaded.");
    } catch (error) {
      console.error(error);
      setMessage("Could not download import report.");
    }
  }

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

      <div className="mt-8">
        <ImportPolicyStrip
          batchStatus={selectedBatch?.status}
          totalRows={summary?.total_rows}
          issueCount={selectedBatch?.issue_count}
          loading={loading}
        />
      </div>

      <div className="mt-8">
        <ImportCommitResultCard
          result={commitResult}
          onDismiss={() => setCommitResult(null)}
        />
      </div>

      {message ? (
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-6 text-ledger-muted">
          {message}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total rows"
          value={summary?.total_rows ?? 0}
          helper="Rows parsed from CSV"
          icon={FileSpreadsheet}
          tone="blue"
          loading={loading}
        />

        <MetricCard
          label="Committed"
          value={summary?.committed_rows ?? 0}
          helper="Rows already added to ledger"
          icon={CheckCircle2}
          tone="green"
          loading={loading}
        />

        <MetricCard
          label="Needs review"
          value={summary?.needs_review_rows ?? 0}
          helper="Warning/info rows awaiting decision"
          icon={AlertTriangle}
          tone="amber"
          loading={loading}
        />

        <MetricCard
          label="Blocked"
          value={summary?.blocked_rows ?? 0}
          helper="Error rows prevented from import"
          icon={ShieldAlert}
          tone="red"
          loading={loading}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <UploadCsvCard
            groupId={activeGroupId}
            onUploaded={async (batch, uploadMessage) => {
              setSelectedBatchId(batch.id);
              setMessage(uploadMessage);
              setCommitResult(null);
              await refreshAll({
                showLoading: false,
                preferredBatchId: batch.id,
              });
            }}
          />

          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-ledger-blue/20 bg-ledger-blue/10 p-3 text-ledger-blue">
                <FileDown className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-display text-2xl font-semibold">
                  Import report
                </h2>
                <p className="mt-2 text-sm leading-6 text-ledger-muted">
                  Download the app-produced report for this batch. It lists
                  every anomaly detected, the policy used, current row status,
                  and the reviewer action taken.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadReport}
              disabled={!selectedBatchId}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-ledger-muted transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileDown className="h-4 w-4" />
              Download JSON report
            </button>
          </div>

          <ImportBatchSwitcher
            batches={batches}
            selectedBatchId={selectedBatchId}
            loading={loading}
            onSelectBatch={setSelectedBatchId}
            onRefresh={() => refreshAll().catch(console.error)}
          />
        </div>

        <div className="space-y-6">
          <IssueCodeGrid
            summary={summary}
            loading={loading}
            committing={committing}
            disabled={loading || !selectedBatchId || safeRows === 0}
            disabledReason={
              loading
                ? "Import batch data is still loading."
                : !selectedBatchId
                ? "Select an import batch first."
                : "No valid rows are ready to commit."
            }
            onCommit={handleCommit}
          />

          <IssueQueue
            issues={issues}
            loading={issuesLoading}
            onDecisionApplied={() => {
              if (selectedBatchId) {
                loadIssues(selectedBatchId).catch(console.error);
                loadBatches().catch(console.error);
              }
            }}
          />
        </div>
      </div>
    </section>
  );
}
