import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileWarning,
  RefreshCcw,
} from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { LoadingState } from "../../components/ui/LoadingState";
import { getActiveGroupId, resolveActiveGroupId } from "../../lib/activeGroup";
import { getPageCache, setPageCache } from "../../lib/pageCache";
import { getGroups } from "../groups/groupsApi";
import { getDashboardData } from "./dashboardApi";
import { SystemFlow } from "./SystemFlow";
import { RecentActivityPanel } from "./RecentActivityPanel";
import { ProductNarrativePanel } from "./ProductNarrativePanel";
import { RiskMatrix } from "./RiskMatrix";
import {
  type GroupBalances,
  type ImportBatch,
  getDashboardImportStats,
} from "./types";

type DashboardPageCache = {
  batch: ImportBatch | null;
  balances: GroupBalances | null;
};

const DASHBOARD_CACHE_KEY = "dashboard-page";

export function DashboardPage() {
  usePageTitle("Command Center");

  const cachedPage = getPageCache<DashboardPageCache>(DASHBOARD_CACHE_KEY);
  const [batch, setBatch] = useState<ImportBatch | null>(
    cachedPage?.batch ?? null,
  );
  const [balances, setBalances] = useState<GroupBalances | null>(
    cachedPage?.balances ?? null,
  );
  const [loading, setLoading] = useState(!cachedPage);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData({ showLoading = true } = {}) {
      if (showLoading) {
        setLoading(true);
      } else {
        setSyncing(true);
      }
      setError("");

      try {
        const savedGroupId = getActiveGroupId();
        const groupsPromise = getGroups();
        const savedDashboardPromise = savedGroupId
          ? getDashboardData(savedGroupId)
          : null;

        const [groupsResult, savedDashboardResult] = await Promise.allSettled([
          groupsPromise,
          savedDashboardPromise ?? Promise.resolve(null),
        ]);

        if (groupsResult.status === "rejected") {
          throw groupsResult.reason;
        }

        const groups = groupsResult.value;
        const groupId = resolveActiveGroupId(groups, savedGroupId);

        if (!groupId) {
          if (!cancelled) {
            setBatch(null);
            setBalances(null);
            setError("No group is available for this account.");
          }
          return;
        }

        const data =
          savedGroupId === groupId &&
          savedDashboardResult.status === "fulfilled" &&
          savedDashboardResult.value
            ? savedDashboardResult.value
            : await getDashboardData(groupId);

        if (!cancelled) {
          setBatch(data.latestBatch);
          setBalances(data.balances);
          setPageCache<DashboardPageCache>(DASHBOARD_CACHE_KEY, {
            batch: data.latestBatch,
            balances: data.balances,
          });
        }
      } catch {
        if (!cancelled) {
          setError("Dashboard data could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSyncing(false);
        }
      }
    }

    loadData({ showLoading: !cachedPage });

    return () => {
      cancelled = true;
    };
  }, []);

  const summary = batch?.summary;
  const importStats = getDashboardImportStats(batch);

  return (
    <section className="py-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-ledger-green">
            Flatmates ledger
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
            Turn the messy spreadsheet into clear paybacks.
          </h1>
          <p className="mt-4 max-w-3xl text-ledger-muted">
            Aisha, Rohan, Priya, Meera, Dev, and Sam all appear in the same
            story, but not for the same dates. This dashboard shows what has
            safely entered the ledger, what still needs a human decision, and
            who currently owes whom.
          </p>
        </div>

        {loading && !batch ? (
          <StatusBadge tone="neutral">Loading</StatusBadge>
        ) : syncing ? (
          <StatusBadge tone="blue">Syncing</StatusBadge>
        ) : batch ? (
          <StatusBadge tone="amber">{batch.status}</StatusBadge>
        ) : null}
      </div>

      {syncing ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-ledger-blue/20 bg-ledger-blue/10 px-4 py-3 text-sm text-ledger-blue">
          <RefreshCcw className="h-4 w-4 animate-spin" />
          Refreshing dashboard data in the background. The numbers below are
          the latest cached view until sync finishes.
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-2xl border border-ledger-red/20 bg-ledger-red/10 px-4 py-3 text-sm text-ledger-red">
          {error}
        </div>
      ) : null}

      <div className="mt-8">
        <ProductNarrativePanel />
      </div>

      <div className="mt-8">
        <SystemFlow />
      </div>

      <div className="mt-8">
        <RiskMatrix
          summary={summary}
          issueCount={batch?.issue_count ?? 0}
          loading={loading && !summary}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Committed rows"
          value={importStats.committedRows}
          helper="CSV rows already turned into expenses or payments"
          icon={CheckCircle2}
          tone="green"
          loading={loading && !batch}
        />
        <MetricCard
          label="Needs review"
          value={importStats.reviewRows}
          helper="Rows waiting for approval, skip, or settlement handling"
          icon={AlertTriangle}
          tone="amber"
          loading={loading && !batch}
        />
        <MetricCard
          label="Blocked rows"
          value={importStats.blockedRows}
          helper="Rows stopped because money would be unsafe to calculate"
          icon={FileWarning}
          tone="red"
          loading={loading && !batch}
        />
        <MetricCard
          label="Total issues"
          value={importStats.totalIssues}
          helper="Every anomaly the importer surfaced"
          icon={BrainCircuit}
          tone="violet"
          loading={loading && !batch}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-ledger-green" />
            <h2 className="font-display text-2xl font-semibold">
              What still needs attention
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            {loading && !summary ? (
              <LoadingState
                title="Loading import health"
                description="Checking the latest CSV import report."
              />
            ) : null}

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

            {!loading && !summary ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-ledger-muted">
                No import batch available yet.
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <CircleDollarSign className="h-5 w-5 text-ledger-blue" />
            <h2 className="font-display text-2xl font-semibold">
              Current money picture
            </h2>
          </div>

          <div className="mt-6 space-y-3">
            {loading && !balances ? (
              <LoadingState
                title="Loading balances"
                description="Calculating balances from committed ledger rows."
                tone="blue"
              />
            ) : null}

            {balances?.balances.map((line) => (
                <div
                  key={line.person}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span>{line.person}</span>
                  <span
                    className={
                      line.balance_paise >= 0
                        ? "text-ledger-green"
                        : "text-ledger-red"
                    }
                  >
                    Rs {line.balance_rupees}
                  </span>
                </div>
            ))}

            {!loading && !balances?.balances.length ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-ledger-muted">
                No committed ledger balances available yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <RecentActivityPanel />
      </div>
    </section>
  );
}
