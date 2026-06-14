import { useEffect, useState } from "react";
import {
  Activity,
  FileCheck2,
  GitCommitHorizontal,
  RefreshCcw,
  UploadCloud,
} from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getAuditLogs } from "../audit/auditApi";
import { type AuditLog } from "./types";

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

export function RecentActivityPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    setLoading(true);

    try {
      const data = await getAuditLogs();
      setLogs(data.slice(0, 6));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs().catch(console.error);
  }, []);

  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-ledger-green" />
            <h2 className="font-display text-2xl font-semibold">
              Recent activity
            </h2>
          </div>

          <p className="mt-1 text-sm text-ledger-muted">
            Latest evidence from the audit log.
          </p>
        </div>

        <button
          onClick={() => loadLogs().catch(console.error)}
          className="rounded-2xl border border-white/10 p-3 text-ledger-muted transition hover:bg-white/5 hover:text-white"
          aria-label="Refresh recent activity"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-ledger-muted">
            Loading recent activity...
          </div>
        ) : null}

        {!loading && !logs.length ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-ledger-muted">
            No audit activity yet. Upload or commit an import to generate
            system evidence.
          </div>
        ) : null}

        {logs.map((log) => {
          const Icon = getActionIcon(log.action);

          return (
            <div
              key={log.id}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-ledger-green/20 hover:bg-white/[0.05]"
            >
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

                      <StatusBadge tone="neutral">
                        {log.entity_type}
                      </StatusBadge>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-ledger-muted">
                      {log.note || `Entity ID: ${log.entity_id}`}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-ledger-muted">
                  {formatDateTime(log.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
