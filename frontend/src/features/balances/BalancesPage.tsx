import { useEffect, useMemo, useState } from "react";
import {
  CircleDollarSign,
  ReceiptText,
  RefreshCcw,
  Scale,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { LoadingState } from "../../components/ui/LoadingState";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getActiveGroupId, resolveActiveGroupId } from "../../lib/activeGroup";
import { getPageCache, setPageCache } from "../../lib/pageCache";
import { getGroups } from "../groups/groupsApi";
import { getGroupBalances } from "./balancesApi";
import { BalanceRadar } from "./BalanceRadar";
import { SettlementGraph } from "./SettlementGraph";
import {
  type BreakdownItem,
  type GroupBalances,
  calculateBalanceTotals,
  formatMoney,
  getBalanceLabel,
  getBalanceTextClass,
} from "./types";

type BalancesPageCache = {
  balances: GroupBalances | null;
  selectedPerson: string;
};

const BALANCES_CACHE_KEY = "balances-page";

export function BalancesPage() {
  usePageTitle("Balances");

  const cachedPage = getPageCache<BalancesPageCache>(BALANCES_CACHE_KEY);
  const [balances, setBalances] = useState<GroupBalances | null>(
    cachedPage?.balances ?? null,
  );
  const [selectedPerson, setSelectedPerson] = useState<string>(
    cachedPage?.selectedPerson ?? "Aisha",
  );
  const [loading, setLoading] = useState(!cachedPage);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  async function loadBalances({
    showLoading = true,
    successMessage,
  }: {
    showLoading?: boolean;
    successMessage?: string;
  } = {}) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const savedGroupId = getActiveGroupId();
      const groupsPromise = getGroups();
      const savedBalancesPromise = savedGroupId
        ? getGroupBalances(savedGroupId)
        : null;

      const [groupsResult, savedBalancesResult] = await Promise.allSettled([
        groupsPromise,
        savedBalancesPromise ?? Promise.resolve(null),
      ]);

      if (groupsResult.status === "rejected") {
        throw groupsResult.reason;
      }

      const groups = groupsResult.value;
      const groupId = resolveActiveGroupId(groups, savedGroupId);

      if (!groupId) {
        setBalances(null);
        setPageCache<BalancesPageCache>(BALANCES_CACHE_KEY, {
          balances: null,
          selectedPerson,
        });
        return;
      }

      const data =
        savedGroupId === groupId &&
        savedBalancesResult.status === "fulfilled" &&
        savedBalancesResult.value
          ? savedBalancesResult.value
          : await getGroupBalances(groupId);
      const nextSelectedPerson =
        data.balances.find((line) => line.person === selectedPerson)?.person ??
        data.balances[0]?.person ??
        "Aisha";

      setBalances(data);
      setSelectedPerson(nextSelectedPerson);
      setPageCache<BalancesPageCache>(BALANCES_CACHE_KEY, {
        balances: data,
        selectedPerson: nextSelectedPerson,
      });

      if (successMessage) {
        setMessage(successMessage);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    loadBalances({ showLoading: !cachedPage }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const balanceTotals = useMemo(() => {
    return calculateBalanceTotals(balances?.balances ?? []);
  }, [balances]);

  const selectedBreakdown = useMemo(() => {
    if (!balances) return [];

    return (balances.breakdown[selectedPerson] ?? []) as BreakdownItem[];
  }, [balances, selectedPerson]);

  if (loading) {
    return (
      <section className="py-8">
        <LoadingState
          title="Loading balances"
          description="Calculating committed ledger balances and suggested settlements."
          icon={CircleDollarSign}
          tone="blue"
        />
      </section>
    );
  }

  if (!balances) {
    return (
      <section className="py-8">
        <div className="glass-panel rounded-3xl p-8 text-ledger-muted">
          No balance data found. Commit import rows first.
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-ledger-green">
            Balance Intelligence
          </p>

          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
            Every rupee has a trace.
          </h1>

          <p className="mt-4 max-w-3xl text-ledger-muted">
            Balances are calculated only from committed ledger rows. Each number
            can be traced back to paid expenses, owed shares, and settlement
            effects.
          </p>
        </div>

        <button
          onClick={() =>
            loadBalances({
              showLoading: false,
              successMessage: "Balances refreshed from committed ledger rows.",
            }).catch((error) => {
              console.error(error);
              setMessage("Could not refresh balances. Please try again.");
            })
          }
          disabled={refreshing}
          className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-ledger-muted transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh balances"}
        </button>
      </div>

      {message ? (
        <div className="mt-6 rounded-2xl border border-ledger-green/20 bg-ledger-green/10 px-4 py-3 text-sm text-ledger-green">
          {message}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Members in ledger"
          value={balances.balances.length}
          helper={balances.group_name}
          icon={WalletCards}
          tone="blue"
        />

        <MetricCard
          label="Total receivable"
          value={formatMoney((balanceTotals.totalPositive / 100).toFixed(2))}
          helper="Sum owed to creditors"
          icon={TrendingUp}
          tone="green"
        />

        <MetricCard
          label="Total payable"
          value={formatMoney((balanceTotals.totalNegative / 100).toFixed(2))}
          helper="Sum owed by debtors"
          icon={TrendingDown}
          tone="red"
        />

        <MetricCard
          label="Suggested settlements"
          value={balances.suggested_settlements.length}
          helper="Minimum transfer suggestions"
          icon={Scale}
          tone="violet"
        />
      </div>

      <div className="mt-8">
        <BalanceRadar balances={balances.balances} />
      </div>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="glass-panel ring-gradient rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-ledger-blue/20 bg-ledger-blue/10 p-3 text-ledger-blue">
                <CircleDollarSign className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-display text-2xl font-semibold">
                  Net positions
                </h2>
                <p className="text-sm text-ledger-muted">
                  Positive means user gets back money.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {balances.balances.map((line) => (
                <button
                  key={line.person}
                  onClick={() => setSelectedPerson(line.person)}
                  className={`w-full rounded-3xl border p-5 text-left transition ${
                    selectedPerson === line.person
                      ? "border-ledger-green/40 bg-ledger-green/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-xl font-semibold">
                        {line.person}
                      </p>
                      <p className="mt-1 text-sm text-ledger-muted">
                        {getBalanceLabel(line.balance_paise)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-display text-2xl font-semibold ${getBalanceTextClass(
                          line.balance_paise,
                        )}`}
                      >
                        {formatMoney(line.balance_rupees)}
                      </p>

                      <p className="mt-1 text-xs text-ledger-muted">
                        {line.balance_paise} paise
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <SettlementGraph settlements={balances.suggested_settlements} />
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <ReceiptText className="h-5 w-5 text-ledger-amber" />

              <div>
                <h2 className="font-display text-2xl font-semibold">
                  Breakdown for {selectedPerson}
                </h2>
                <p className="text-sm text-ledger-muted">
                  No magic number. Every balance movement is visible.
                </p>
              </div>
            </div>

            <StatusBadge tone="violet">
              {`${selectedBreakdown.length} entries`}
            </StatusBadge>
          </div>

          <div className="mt-6 max-h-[min(70vh,760px)] space-y-3 overflow-y-auto pr-1">
            {selectedBreakdown.map((item, index) => {
              const isPositive = (item.amount_paise ?? 0) > 0;

              return (
                <div
                  key={`${item.expense_id}-${item.type}-${index}`}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={isPositive ? "green" : "red"}>
                          {item.type ?? "LEDGER_ENTRY"}
                        </StatusBadge>

                        {item.date ? (
                          <span className="text-xs text-ledger-muted">
                            {item.date}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-3 font-display text-lg font-semibold">
                        {item.description ?? "Ledger movement"}
                      </h3>
                    </div>

                    <p
                      className={`font-display text-xl font-semibold ${
                        isPositive ? "text-ledger-green" : "text-ledger-red"
                      }`}
                    >
                      {formatMoney(((item.amount_paise ?? 0) / 100).toFixed(2))}
                    </p>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-ledger-muted">
                    {item.explanation ?? "Balance movement recorded."}
                  </p>

                  {item.expense_id ? (
                    <p className="mt-3 text-xs text-ledger-muted">
                      Expense ID: {item.expense_id}
                    </p>
                  ) : null}

                  {item.settlement_id ? (
                    <p className="mt-3 text-xs text-ledger-muted">
                      Settlement ID: {item.settlement_id}
                    </p>
                  ) : null}
                </div>
              );
            })}

            {!selectedBreakdown.length ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-ledger-muted">
                No breakdown entries for this person.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
