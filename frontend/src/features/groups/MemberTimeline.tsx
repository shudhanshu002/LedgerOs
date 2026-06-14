import {
  CalendarClock,
  Crown,
  ShieldCheck,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { type GroupMembership } from "./types";

type MemberTimelineProps = {
  memberships: GroupMembership[];
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

function getMemberRiskText(member: GroupMembership) {
  if (member.left_at) {
    return "Historical member. Expenses after leave date are flagged as inactive-member anomalies.";
  }

  return "Active member. Eligible for new group expenses and import validation.";
}

export function MemberTimeline({ memberships }: MemberTimelineProps) {
  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-5 w-5 text-ledger-blue" />

          <div>
            <h2 className="font-display text-2xl font-semibold">
              Membership timeline
            </h2>
            <p className="mt-1 text-sm text-ledger-muted">
              The backend checks every imported expense against these dates.
            </p>
          </div>
        </div>

        <StatusBadge tone="blue">
          {`${memberships.length} member records`}
        </StatusBadge>
      </div>

      <div className="relative mt-8">
        <div className="absolute left-5 top-0 hidden h-full w-px bg-gradient-to-b from-ledger-green via-white/10 to-transparent md:block" />

        <div className="space-y-4">
          {memberships.map((member, index) => {
            const status = getMembershipStatus(member);
            const isAdmin = member.role === "ADMIN";

            return (
              <div
                key={member.id}
                className="relative rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-ledger-green/20 hover:bg-white/[0.05] md:ml-12"
              >
                <div className="absolute -left-[3.15rem] top-6 hidden h-10 w-10 items-center justify-center rounded-2xl border border-ledger-green/20 bg-ledger-bg text-ledger-green md:flex">
                  {isAdmin ? (
                    <Crown className="h-4 w-4" />
                  ) : status === "ACTIVE" ? (
                    <UserCheck className="h-4 w-4" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                </div>

                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/20 font-display text-lg font-semibold text-white">
                      {member.user_detail.username.charAt(0)}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-xl font-semibold">
                          {member.user_detail.username}
                        </h3>

                        {index === 0 ? (
                          <span className="rounded-full border border-ledger-green/20 bg-ledger-green/10 px-2.5 py-1 text-[11px] font-medium text-ledger-green">
                            Primary demo user
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-sm text-ledger-muted">
                        {member.user_detail.email}
                      </p>

                      <p className="mt-3 max-w-2xl text-sm leading-6 text-ledger-muted">
                        {getMemberRiskText(member)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={isAdmin ? "violet" : "blue"}>
                      {member.role}
                    </StatusBadge>

                    <StatusBadge tone={status === "ACTIVE" ? "green" : "amber"}>
                      {status}
                    </StatusBadge>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
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

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-ledger-muted">
                      Import impact
                    </p>
                    <p
                      className={`mt-1 font-medium ${
                        status === "ACTIVE"
                          ? "text-ledger-green"
                          : "text-ledger-amber"
                      }`}
                    >
                      {status === "ACTIVE" ? "Allowed" : "Date restricted"}
                    </p>
                  </div>
                </div>

                {member.left_at ? (
                  <div className="mt-4 rounded-2xl border border-ledger-amber/20 bg-ledger-amber/10 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-ledger-amber" />
                      <p className="text-sm leading-6 text-ledger-muted">
                        This member can still appear in old expenses, but new
                        imported expenses after the leave date should be
                        reviewed before commit.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
