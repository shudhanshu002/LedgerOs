import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Crown,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { api } from "../../lib/api";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusBadge } from "../../components/ui/StatusBadge";

type UserMini = {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
};

type GroupMembership = {
  id: number;
  user: number;
  user_detail: UserMini;
  role: "ADMIN" | "MEMBER";
  joined_at: string;
  left_at: string | null;
};

type GroupWithMemberships = {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_by_detail?: UserMini;
  memberships: GroupMembership[];
  created_at: string;
  updated_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "Active";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getMembershipStatus(member: GroupMembership) {
  return member.left_at ? "LEFT" : "ACTIVE";
}

export function GroupsPage() {
  const [groups, setGroups] = useState<GroupWithMemberships[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGroups() {
      const response = await api.get<GroupWithMemberships[]>("/api/groups/");
      setGroups(response.data);
    }

    loadGroups()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeGroup = groups[0];

  const stats = useMemo(() => {
    const memberships = activeGroup?.memberships ?? [];

    return {
      total: memberships.length,
      active: memberships.filter((member) => !member.left_at).length,
      left: memberships.filter((member) => member.left_at).length,
      admins: memberships.filter((member) => member.role === "ADMIN").length,
    };
  }, [activeGroup]);

  if (loading) {
    return (
      <section className="py-8">
        <div className="glass-panel rounded-3xl p-8 text-ledger-muted">
          Loading group intelligence...
        </div>
      </section>
    );
  }

  if (!activeGroup) {
    return (
      <section className="py-8">
        <div className="glass-panel rounded-3xl p-8">
          <p className="text-ledger-muted">No groups found.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-ledger-green">
            Group Control
          </p>

          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
            Membership timeline protects the ledger.
          </h1>

          <p className="mt-4 max-w-3xl text-ledger-muted">
            Every CSV row is checked against this timeline before it can affect
            balances. People are not charged before joining or after leaving.
          </p>
        </div>

        <StatusBadge tone="green">Workspace active</StatusBadge>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total members"
          value={stats.total}
          helper="All historical members in this group"
          icon={Users}
          tone="blue"
        />

        <MetricCard
          label="Active members"
          value={stats.active}
          helper="Currently eligible for new expenses"
          icon={UserCheck}
          tone="green"
        />

        <MetricCard
          label="Left members"
          value={stats.left}
          helper="Still included in historical balances"
          icon={UserMinus}
          tone="amber"
        />

        <MetricCard
          label="Admins"
          value={stats.admins}
          helper="Can review and commit imports"
          icon={Crown}
          tone="violet"
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel ring-gradient rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-3 text-ledger-green">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold">
                {activeGroup.name}
              </h2>
              <p className="text-sm text-ledger-muted">
                Relational group workspace
              </p>
            </div>
          </div>

          <p className="mt-6 leading-7 text-ledger-muted">
            {activeGroup.description ||
              "This group controls shared expenses, memberships, import review, and final balances."}
          </p>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-ledger-muted">
              Safety rule
            </p>
            <p className="mt-3 text-lg leading-8">
              Import rows are validated against member join and leave dates.
              This is why the backend can detect{" "}
              <span className="text-ledger-amber">INACTIVE_MEMBER</span>{" "}
              anomalies.
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-ledger-blue" />
            <h2 className="font-display text-2xl font-semibold">
              Membership timeline
            </h2>
          </div>

          <div className="mt-6 space-y-3">
            {activeGroup.memberships.map((member) => {
              const status = getMembershipStatus(member);

              return (
                <div
                  key={member.id}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-ledger-green/20 hover:bg-white/[0.05]"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 font-display text-lg font-semibold">
                          {member.user_detail.username.charAt(0)}
                        </div>

                        <div>
                          <p className="font-display text-xl font-semibold">
                            {member.user_detail.username}
                          </p>
                          <p className="text-sm text-ledger-muted">
                            {member.user_detail.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        tone={member.role === "ADMIN" ? "violet" : "blue"}
                      >
                        {member.role}
                      </StatusBadge>

                      <StatusBadge tone={status === "ACTIVE" ? "green" : "amber"}>
                        {status}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-ledger-muted">
                        Joined
                      </p>
                      <p className="mt-1 font-medium">
                        {formatDate(member.joined_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-ledger-muted">
                        Left
                      </p>
                      <p className="mt-1 font-medium">
                        {formatDate(member.left_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}