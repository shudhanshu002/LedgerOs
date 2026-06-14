import {
  AlertTriangle,
  CalendarCheck2,
  DatabaseZap,
  GitBranch,
  ShieldCheck,
  Users,
} from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { type GroupWithMemberships } from "./types";

type GroupSafetyCardProps = {
  group: GroupWithMemberships;
};

export function GroupSafetyCard({ group }: GroupSafetyCardProps) {
  const activeMembers = group.memberships.filter((member) => !member.left_at);
  const historicalMembers = group.memberships.filter((member) => member.left_at);
  const admins = group.memberships.filter((member) => member.role === "ADMIN");

  return (
    <div className="glass-panel ring-gradient rounded-3xl p-6">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-3 text-ledger-green">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold">
              {group.name}
            </h2>

            <p className="mt-1 text-sm text-ledger-muted">
              Relational group workspace · Group ID #{group.id}
            </p>
          </div>
        </div>

        <StatusBadge tone="green">Validation enabled</StatusBadge>
      </div>

      <p className="mt-6 text-sm leading-7 text-ledger-muted">
        {group.description ||
          "This group controls shared expenses, memberships, import review, and final balances."}
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-ledger-green/20 bg-ledger-green/10 p-5">
          <div className="flex items-center gap-2 text-ledger-green">
            <Users className="h-4 w-4" />
            <p className="text-sm font-medium">Active members</p>
          </div>

          <p className="mt-3 font-display text-3xl font-semibold text-white">
            {activeMembers.length}
          </p>

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Eligible for current expenses and new CSV rows.
          </p>
        </div>

        <div className="rounded-3xl border border-ledger-amber/20 bg-ledger-amber/10 p-5">
          <div className="flex items-center gap-2 text-ledger-amber">
            <CalendarCheck2 className="h-4 w-4" />
            <p className="text-sm font-medium">Historical</p>
          </div>

          <p className="mt-3 font-display text-3xl font-semibold text-white">
            {historicalMembers.length}
          </p>

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Included in past balances but date restricted.
          </p>
        </div>

        <div className="rounded-3xl border border-ledger-violet/20 bg-ledger-violet/10 p-5">
          <div className="flex items-center gap-2 text-ledger-violet">
            <ShieldCheck className="h-4 w-4" />
            <p className="text-sm font-medium">Admins</p>
          </div>

          <p className="mt-3 font-display text-3xl font-semibold text-white">
            {admins.length}
          </p>

          <p className="mt-1 text-xs leading-5 text-ledger-muted">
            Can review risky imports and commit safe rows.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-ledger-blue/20 bg-ledger-blue/10 p-3 text-ledger-blue">
              <DatabaseZap className="h-5 w-5" />
            </div>

            <div>
              <p className="font-display text-lg font-semibold">
                Relational safety rule
              </p>

              <p className="mt-2 text-sm leading-7 text-ledger-muted">
                Expenses, splits, settlements, import batches, import rows, and
                audit logs are stored as separate relational records. This keeps
                the ledger explainable and queryable.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-ledger-amber/20 bg-ledger-amber/10 p-3 text-ledger-amber">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div>
              <p className="font-display text-lg font-semibold">
                Membership anomaly detection
              </p>

              <p className="mt-2 text-sm leading-7 text-ledger-muted">
                If a CSV row contains a person who was not active on the expense
                date, the backend flags it as{" "}
                <span className="text-ledger-amber">INACTIVE_MEMBER</span>{" "}
                before the row can affect balances.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-3 text-ledger-green">
              <GitBranch className="h-5 w-5" />
            </div>

            <div>
              <p className="font-display text-lg font-semibold">
                Review-first workflow
              </p>

              <p className="mt-2 text-sm leading-7 text-ledger-muted">
                The frontend mirrors the backend policy: upload creates an
                import batch, review resolves anomalies, and commit moves only
                safe rows into the expense ledger.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
