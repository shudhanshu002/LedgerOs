import { FileWarning } from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { IssueDecisionPanel } from "./IssueDecisionPanel";
import {
  type ImportIssue,
  type Tone,
  getIssueStatusTone,
  getSeverityTone,
} from "./types";

type IssueQueueProps = {
  issues: ImportIssue[];
  loading?: boolean;
  onDecisionApplied: () => void;
};

function formatDateTime(value: string | null) {
  if (!value) return "Not reviewed";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRowStatusTone(status?: ImportIssue["row_status"]): Tone {
  if (status === "BLOCKED") return "red";
  if (status === "NEEDS_REVIEW") return "amber";
  if (status === "VALID") return "green";
  if (status === "COMMITTED") return "green";
  if (status === "SKIPPED") return "neutral";
  return "neutral";
}

function getSeverityRank(severity: ImportIssue["severity"]) {
  if (severity === "ERROR") return 0;
  if (severity === "WARNING") return 1;
  return 2;
}

export function IssueQueue({
  issues,
  loading = false,
  onDecisionApplied,
}: IssueQueueProps) {
  const sortedIssues = [...issues].sort((left, right) => {
    const leftRow = left.row_number ?? Number.MAX_SAFE_INTEGER;
    const rightRow = right.row_number ?? Number.MAX_SAFE_INTEGER;

    if (leftRow !== rightRow) {
      return leftRow - rightRow;
    }

    return getSeverityRank(left.severity) - getSeverityRank(right.severity);
  });

  function getOpenSiblingIssues(issue: ImportIssue) {
    if (!issue.row) {
      return [];
    }

    return issues.filter(
      (candidate) =>
        candidate.row === issue.row &&
        candidate.id !== issue.id &&
        candidate.status === "OPEN",
    );
  }

  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <FileWarning className="h-5 w-5 text-ledger-red" />

        <div>
          <h2 className="font-display text-2xl font-semibold">
            Review queue
          </h2>
          <p className="mt-1 text-sm text-ledger-muted">
            Open issues can be approved, skipped, rejected, or converted into
            settlements depending on backend policy.
          </p>
        </div>
      </div>

      <div className="mt-5 max-h-[760px] space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex gap-2">
                  <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-white/10" />
                </div>
                <div className="mt-4 h-5 w-44 animate-pulse rounded-full bg-white/10" />
                <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-white/10" />
                <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
              </div>
            ))}
          </>
        ) : null}

        {!loading && sortedIssues.map((issue) => (
          <IssueQueueItem
            key={issue.id}
            issue={issue}
            openSiblingIssues={getOpenSiblingIssues(issue)}
            onDecisionApplied={onDecisionApplied}
          />
        ))}

        {!loading && !issues.length ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-ledger-muted">
            No issues found for this batch.
          </div>
        ) : null}
      </div>
    </div>
  );
}

type IssueQueueItemProps = {
  issue: ImportIssue;
  openSiblingIssues: ImportIssue[];
  onDecisionApplied: () => void;
};

function IssueQueueItem({
  issue,
  openSiblingIssues,
  onDecisionApplied,
}: IssueQueueItemProps) {
  const openSiblingLabels = openSiblingIssues.map(
    (sibling) => `${sibling.code} (#${sibling.id})`,
  );

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-ledger-green/20 hover:bg-white/[0.05]">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={getSeverityTone(issue.severity)}>
              {issue.severity}
            </StatusBadge>

            <StatusBadge tone={getIssueStatusTone(issue.status)}>
              {issue.status}
            </StatusBadge>

            <span className="text-xs text-ledger-muted">
              Issue #{issue.id}
            </span>
          </div>

          <h3 className="mt-3 font-display text-lg font-semibold">
            {issue.code}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ledger-muted">
            <span>
              {issue.row_number
                ? `CSV row ${issue.row_number}`
                : "Batch-level issue"}
            </span>

            {issue.row_status ? (
              <StatusBadge tone={getRowStatusTone(issue.row_status)}>
                {`Row ${issue.row_status}`}
              </StatusBadge>
            ) : null}
          </div>
        </div>

        <div className="text-right text-xs text-ledger-muted">
          {formatDateTime(issue.reviewed_at)}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-ledger-muted">
        {issue.message}
      </p>

      {openSiblingLabels.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-ledger-amber/20 bg-ledger-amber/10 p-4 text-sm leading-6 text-ledger-muted">
          Other open issue{openSiblingLabels.length === 1 ? "" : "s"} on this
          row: <span className="text-white">{openSiblingLabels.join(", ")}</span>.
          This row will not become valid until those are approved, skipped, or
          resolved too.
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-ledger-muted">
          Suggested action
        </p>
        <p className="mt-2 text-sm">{issue.suggested_action}</p>
      </div>

      <IssueDecisionPanel
        issue={issue}
        onDecisionApplied={onDecisionApplied}
      />
    </div>
  );
}
