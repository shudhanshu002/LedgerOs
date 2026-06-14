import {
  Activity,
  FileCheck2,
  GitCommitHorizontal,
  UploadCloud,
} from "lucide-react";
import { type AuditLog } from "../../types/api";
import { StatusBadge } from "../../components/ui/StatusBadge";

type AuditEventCardProps = {
  log: AuditLog;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getActionTone(action: string) {
  if (action.includes("UPLOAD")) return "blue";
  if (action.includes("REVIEW")) return "violet";
  if (action.includes("COMMIT")) return "green";
  if (action.includes("DELETE") || action.includes("REMOVE")) return "red";
  return "neutral";
}

function getActionIcon(action: string) {
  if (action.includes("UPLOAD")) return UploadCloud;
  if (action.includes("REVIEW")) return FileCheck2;
  if (action.includes("COMMIT")) return GitCommitHorizontal;
  return Activity;
}

function getActionSummary(log: AuditLog) {
  if (log.note) return log.note;

  if (log.action.includes("UPLOAD")) {
    return "A CSV import batch was uploaded and analyzed by the backend.";
  }

  if (log.action.includes("REVIEW")) {
    return "An import issue review decision was recorded.";
  }

  if (log.action.includes("COMMIT")) {
    return "Safe rows were committed into the financial ledger.";
  }

  return `Action recorded for entity ${log.entity_type}.`;
}

export function AuditEventCard({ log }: AuditEventCardProps) {
  const Icon = getActionIcon(log.action);

  return (
    <article className="rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-ledger-green/20 hover:bg-white/[0.05]">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-ledger-green">
            <Icon className="h-5 w-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={getActionTone(log.action)}>
                {log.action}
              </StatusBadge>

              <StatusBadge tone="neutral">{log.entity_type}</StatusBadge>
            </div>

            <p className="mt-3 font-display text-xl font-semibold">
              Event #{log.id}
            </p>

            <p className="mt-1 text-sm text-ledger-muted">
              Entity ID: {log.entity_id}
            </p>
          </div>
        </div>

        <p className="text-sm text-ledger-muted">
          {formatDateTime(log.created_at)}
        </p>
      </div>

      <p className="mt-4 leading-7 text-ledger-muted">
        {getActionSummary(log)}
      </p>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-ledger-muted">
          Metadata
        </p>

        <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-ledger-muted">
          {JSON.stringify(log.metadata ?? {}, null, 2)}
        </pre>
      </div>
    </article>
  );
}