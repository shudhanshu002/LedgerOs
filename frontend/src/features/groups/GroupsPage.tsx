import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  Crown,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { LoadingState } from "../../components/ui/LoadingState";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { resolveActiveGroupId, saveActiveGroupId } from "../../lib/activeGroup";
import { GroupSafetyCard } from "./GroupSafetyCard";
import {
  addGroupMember,
  createGroup,
  getGroups,
  getUsers,
  updateGroupMembership,
} from "./groupsApi";
import { MemberTimeline } from "./MemberTimeline";
import {
  type GroupWithMemberships,
  type UserMini,
  calculateGroupStats,
} from "./types";

const fieldClassName =
  "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-ledger-muted focus:border-ledger-green/50 focus:bg-black/40";

const selectClassName = `${fieldClassName} cursor-pointer appearance-none`;

export function GroupsPage() {
  usePageTitle("Groups");

  const [groups, setGroups] = useState<GroupWithMemberships[]>([]);
  const [users, setUsers] = useState<UserMini[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [memberJoinedAt, setMemberJoinedAt] = useState("2026-02-01");
  const [memberLeftAt, setMemberLeftAt] = useState("");

  async function loadGroups() {
    const [groupData, userData] = await Promise.all([getGroups(), getUsers()]);
    const resolvedGroupId = resolveActiveGroupId(groupData, activeGroupId);

    setGroups(groupData);
    setUsers(userData);
    setActiveGroupId(resolvedGroupId);
  }

  useEffect(() => {
    loadGroups()
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const group = await createGroup({
        name: groupName,
        description: groupDescription,
      });

      saveActiveGroupId(group.id);
      setActiveGroupId(group.id);
      setGroupName("");
      setGroupDescription("");
      setMessage(`Created group: ${group.name}`);
      await loadGroups();
    } catch {
      setMessage("Could not create group. Check required fields.");
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeGroupId || !memberUserId) return;

    setMessage("");

    try {
      await addGroupMember(activeGroupId, {
        user: Number(memberUserId),
        role: memberRole,
        joined_at: memberJoinedAt,
        left_at: memberLeftAt || null,
      });

      setMessage("Member timeline added.");
      setMemberUserId("");
      setMemberLeftAt("");
      await loadGroups();
    } catch {
      setMessage("Could not add member. The user may already have that join date.");
    }
  }

  async function markLeft(membershipId: number) {
    const leftAt = window.prompt("Leave date (YYYY-MM-DD)", "2026-03-31");

    if (!leftAt) return;

    try {
      await updateGroupMembership(membershipId, { left_at: leftAt });
      setMessage("Membership leave date updated.");
      await loadGroups();
    } catch {
      setMessage("Could not update membership.");
    }
  }

  function handleSelectGroup(groupId: number) {
    saveActiveGroupId(groupId);
    setActiveGroupId(groupId);
  }

  const activeGroup =
    groups.find((group) => group.id === activeGroupId) ?? groups[0];

  const stats = useMemo(() => {
    return calculateGroupStats(activeGroup?.memberships ?? []);
  }, [activeGroup]);

  if (loading) {
    return (
      <section className="py-8">
        <LoadingState
          title="Loading groups"
          description="Fetching group records, users, and membership timelines."
          icon={Users}
          tone="blue"
        />
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

      {message ? (
        <div className="mt-6 rounded-2xl border border-ledger-green/20 bg-ledger-green/10 px-4 py-3 text-sm text-ledger-green">
          {message}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={handleCreateGroup}
          className="glass-panel rounded-3xl p-6"
        >
          <h2 className="font-display text-2xl font-semibold">Create group</h2>

          <div className="mt-5 grid gap-3">
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group name"
              className={fieldClassName}
            />
            <textarea
              value={groupDescription}
              onChange={(event) => setGroupDescription(event.target.value)}
              placeholder="Description"
              className={`${fieldClassName} min-h-24 resize-none`}
            />
            <button className="rounded-2xl bg-white px-4 py-3 font-semibold text-ledger-bg">
              Create group
            </button>
          </div>
        </form>

        <div className="glass-panel rounded-3xl p-6">
          <h2 className="font-display text-2xl font-semibold">Active group</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleSelectGroup(group.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  activeGroup?.id === group.id
                    ? "border-ledger-green/40 bg-ledger-green/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                }`}
              >
                <p className="font-display text-lg font-semibold">
                  {group.name}
                </p>
                <p className="mt-1 text-xs text-ledger-muted">
                  {group.memberships.length} membership records
                </p>
              </button>
            ))}
          </div>
        </div>
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
        <div className="space-y-6">
          <GroupSafetyCard group={activeGroup} />

          <form
            onSubmit={handleAddMember}
            className="glass-panel rounded-3xl p-6"
          >
            <h2 className="font-display text-2xl font-semibold">Add member</h2>

            <div className="mt-5 grid gap-3">
              <select
                value={memberUserId}
                onChange={(event) => setMemberUserId(event.target.value)}
                className={selectClassName}
              >
                <option className="bg-ledger-bg text-white" value="">
                  Choose user
                </option>
                {users.map((user) => (
                  <option
                    className="bg-ledger-bg text-white"
                    key={user.id}
                    value={user.id}
                  >
                    {user.username}
                  </option>
                ))}
              </select>

              <div className="grid gap-3 md:grid-cols-3">
                <select
                  value={memberRole}
                  onChange={(event) =>
                    setMemberRole(event.target.value as "ADMIN" | "MEMBER")
                  }
                  className={selectClassName}
                >
                  <option className="bg-ledger-bg text-white" value="MEMBER">
                    Member
                  </option>
                  <option className="bg-ledger-bg text-white" value="ADMIN">
                    Admin
                  </option>
                </select>
                <input
                  type="date"
                  value={memberJoinedAt}
                  onChange={(event) => setMemberJoinedAt(event.target.value)}
                  className={fieldClassName}
                />
                <input
                  type="date"
                  value={memberLeftAt}
                  onChange={(event) => setMemberLeftAt(event.target.value)}
                  className={fieldClassName}
                />
              </div>

              <button className="rounded-2xl bg-white px-4 py-3 font-semibold text-ledger-bg">
                Add timeline entry
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <MemberTimeline memberships={activeGroup.memberships} />

          <div className="glass-panel rounded-3xl p-6">
            <h2 className="font-display text-2xl font-semibold">
              Membership actions
            </h2>
            <div className="mt-5 space-y-3">
              {activeGroup.memberships.map((membership) => (
                <div
                  key={membership.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center"
                >
                  <div>
                    <p className="font-semibold">
                      {membership.user_detail.username}
                    </p>
                    <p className="mt-1 text-xs text-ledger-muted">
                      {membership.joined_at} to {membership.left_at ?? "active"}
                    </p>
                  </div>
                  <button
                    onClick={() => markLeft(membership.id)}
                    className="rounded-xl border border-white/10 px-3 py-2 text-sm text-ledger-muted transition hover:bg-white/5 hover:text-white"
                  >
                    Set leave date
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
