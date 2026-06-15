import { useEffect, useMemo, useState } from "react";
import {
  FileCheck2,
  GitCommitHorizontal,
  RefreshCcw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { LoadingState } from "../../components/ui/LoadingState";
import { MetricCard } from "../../components/ui/MetricCard";
import { getPageCache, setPageCache } from "../../lib/pageCache";
import { getAuditLogs } from "./auditApi";
import { AuditEventCard } from "./AuditEventCard";
import { AuditTrustPanel } from "./AuditTrustPanel";
import { type AuditLog, calculateAuditStats } from "./types";

type AuditTrailPageCache = {
  logs: AuditLog[];
};

const AUDIT_CACHE_KEY = "audit-trail-page";

export function AuditTrailPage() {
  usePageTitle("Audit Trail");

  const cachedPage = getPageCache<AuditTrailPageCache>(AUDIT_CACHE_KEY);
  const [logs, setLogs] = useState<AuditLog[]>(cachedPage?.logs ?? []);
  const [loading, setLoading] = useState(!cachedPage);
  const [refreshing, setRefreshing] = useState(false);

  async function loadLogs({ showLoading = true } = {}) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await getAuditLogs();
      setLogs(data);
      setPageCache<AuditTrailPageCache>(AUDIT_CACHE_KEY, { logs: data });
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    loadLogs({ showLoading: !cachedPage }).catch(console.error);
  }, []);

  const stats = useMemo(() => {
    return calculateAuditStats(logs);
  }, [logs]);

  if (loading) {
    return (
      <section className="py-8">
        <LoadingState
          title="Loading audit trail"
          description="Fetching upload, review decision, and commit evidence."
          icon={ShieldCheck}
          tone="violet"
        />
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-ledger-green">
            Audit Trail
          </p>

          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
            Every critical action leaves evidence.
          </h1>

          <p className="mt-4 max-w-3xl text-ledger-muted">
            Uploads, review decisions, and import commits are recorded as
            immutable audit events. This gives the reviewer a clear operational
            history of how financial data entered the ledger.
          </p>
        </div>

        <button
          onClick={() => loadLogs({ showLoading: false }).catch(console.error)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-ledger-muted transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh logs"}
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total events"
          value={stats.total}
          helper="Actions recorded for accessible groups"
          icon={ShieldCheck}
          tone="green"
        />

        <MetricCard
          label="CSV uploads"
          value={stats.uploads}
          helper="Import batches analyzed"
          icon={UploadCloud}
          tone="blue"
        />

        <MetricCard
          label="Review decisions"
          value={stats.reviews}
          helper="Issue decisions captured"
          icon={FileCheck2}
          tone="violet"
        />

        <MetricCard
          label="Import commits"
          value={stats.commits}
          helper="Ledger entry creation events"
          icon={GitCommitHorizontal}
          tone="amber"
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <AuditTrustPanel />

        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-ledger-green" />
            <h2 className="font-display text-2xl font-semibold">
              Event stream
            </h2>
          </div>

          <div className="mt-6 max-h-[850px] space-y-4 overflow-y-auto pr-1">
            {logs.map((log) => (
              <AuditEventCard key={log.id} log={log} />
            ))}

            {!logs.length ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-ledger-muted">
                No audit logs found yet. Upload or commit an import to generate
                audit records.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
