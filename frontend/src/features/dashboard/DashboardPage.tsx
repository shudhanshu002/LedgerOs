import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileWarning,
} from "lucide-react";
import { api } from "../../lib/api";
import { ImportBatch, GroupBalances } from "../../types/api";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusBadge } from "../../components/ui/StatusBadge";

export function DashboardPage() {
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [balances, setBalances] = useState<GroupBalances | null>(null);

  useEffect(() => {
    async function loadData() {
      const [importsResponse, balancesResponse] = await Promise.all([
        api.get<ImportBatch[]>("/api/imports/"),
        api.get<GroupBalances>("/api/expenses/groups/1/balances/"),
      ]);

      setBatch(importsResponse.data[0] ?? null);
      setBalances(balancesResponse.data);
    }

    loadData().catch(console.error);
  }, []);

  const summary = batch?.summary;

  return (
    <section className="py-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-ledger-green">
            Command Center
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
            Import safety meets expense intelligence.
          </h1>
          <p className="mt-4 max-w-3xl text-ledger-muted">
            This is not a basic Splitwise clone. It is a review-first ledger
            system that protects balances from bad CSV data.
          </p>
        </div>

        {batch ? <StatusBadge tone="amber">{batch.status}</StatusBadge> : null}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Committed rows"
          value={summary?.committed_rows ?? 0}
          helper="Rows that safely entered the ledger"
          icon={CheckCircle2}
          tone="green"
        />
        <MetricCard
          label="Needs review"
          value={summary?.needs_review_rows ?? 0}
          helper="Warnings waiting for operator decision"
          icon={AlertTriangle}
          tone="amber"
        />
        <MetricCard
          label="Blocked rows"
          value={summary?.blocked_rows ?? 0}
          helper="Errors prevented from corrupting balances"
          icon={FileWarning}
          tone="red"
        />
        <MetricCard
          label="Total issues"
          value={batch?.issue_count ?? 0}
          helper="Detected across the uploaded CSV"
          icon={BrainCircuit}
          tone="violet"
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-ledger-green" />
            <h2 className="font-display text-2xl font-semibold">
              Import health
            </h2>
          </div>

          <div className="mt-6 space-y-4">
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
            <CircleDollarSign className="h-5 w-5 text-ledger-blue" />
            <h2 className="font-display text-2xl font-semibold">
              Balance snapshot
            </h2>
          </div>

          <div className="mt-6 space-y-3">
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
                  ₹{line.balance_rupees}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}