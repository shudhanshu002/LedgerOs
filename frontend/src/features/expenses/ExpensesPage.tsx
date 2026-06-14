import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ReceiptText, RefreshCcw, Scale } from "lucide-react";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { resolveActiveGroupId } from "../../lib/activeGroup";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getGroups } from "../groups/groupsApi";
import type { GroupMembership, GroupWithMemberships } from "../groups/types";
import {
  createExpense,
  createSettlement,
  getExpenses,
  getSettlements,
  type Expense,
  type Settlement,
} from "./expensesApi";

export function ExpensesPage() {
  usePageTitle("Expenses");

  const [groups, setGroups] = useState<GroupWithMemberships[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [expenseDate, setExpenseDate] = useState("2026-04-20");
  const [splitType, setSplitType] = useState<
    "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARE"
  >("EQUAL");
  const [participants, setParticipants] = useState<number[]>([]);
  const [splitValuesRaw, setSplitValuesRaw] = useState("");

  const [settlementFrom, setSettlementFrom] = useState("");
  const [settlementTo, setSettlementTo] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementDate, setSettlementDate] = useState("2026-04-20");

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) ?? null,
    [groups, activeGroupId],
  );
  const members = useMemo(() => activeGroup?.memberships ?? [], [activeGroup]);
  const expenseMembers = useMemo(
    () => members.filter((member) => isMemberActiveOn(member, expenseDate)),
    [members, expenseDate],
  );

  async function loadData() {
    setLoading(true);

    try {
      const groupData = await getGroups();
      const resolvedGroupId = resolveActiveGroupId(groupData, activeGroupId);
      const [expenseData, settlementData] = await Promise.all([
        getExpenses(),
        getSettlements(),
      ]);

      setGroups(groupData);
      setActiveGroupId(resolvedGroupId);
      setExpenses(
        expenseData.filter((expense) => expense.group === resolvedGroupId),
      );
      setSettlements(
        settlementData.filter(
          (settlement) => settlement.group === resolvedGroupId,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const activeUserIds = new Set(expenseMembers.map((member) => member.user));

    setParticipants((current) =>
      current.filter((userId) => activeUserIds.has(userId)),
    );

    if (paidBy && !activeUserIds.has(Number(paidBy))) {
      setPaidBy("");
    }
  }, [expenseMembers, paidBy]);

  function toggleParticipant(userId: number) {
    setParticipants((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function handleCreateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeGroupId) return;

    try {
      await createExpense({
        group: activeGroupId,
        paid_by: Number(paidBy),
        description,
        expense_date: expenseDate,
        original_amount: amount,
        original_currency: currency,
        split_type: splitType,
        participants,
        split_values_raw: splitValuesRaw,
      });

      setMessage("Expense created.");
      setDescription("");
      setAmount("");
      setSplitValuesRaw("");
      await loadData();
    } catch {
      setMessage(
        "Could not create expense. Check payer, participants, and split details.",
      );
    }
  }

  async function handleCreateSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeGroupId) return;

    try {
      await createSettlement({
        group: activeGroupId,
        paid_by: Number(settlementFrom),
        paid_to: Number(settlementTo),
        amount_paise: Math.round(Number(settlementAmount) * 100),
        settlement_date: settlementDate,
        note: "Manual settlement",
      });

      setMessage("Settlement recorded.");
      setSettlementAmount("");
      await loadData();
    } catch {
      setMessage("Could not record settlement.");
    }
  }

  if (loading) {
    return (
      <section className="py-8">
        <LoadingState
          title="Loading expenses"
          description="Fetching committed expenses, payments, and date-aware group members."
          icon={ReceiptText}
          tone="green"
        />
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-ledger-green">
            Expense Desk
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
            Create expenses and record payments.
          </h1>
          <p className="mt-4 max-w-3xl text-ledger-muted">
            Manual expenses use the same backend split and date-based
            membership checks as committed CSV expense rows.
          </p>
        </div>
        <button
          onClick={() => loadData().catch(console.error)}
          className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-ledger-muted transition hover:bg-white/5 hover:text-white"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {message ? (
        <div className="mt-6 rounded-2xl border border-ledger-green/20 bg-ledger-green/10 px-4 py-3 text-sm text-ledger-green">
          {message}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleCreateExpense} className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <ReceiptText className="h-5 w-5 text-ledger-green" />
            <h2 className="font-display text-2xl font-semibold">New expense</h2>
          </div>
          <div className="mt-5 grid gap-3">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-ledger-green/40"
            />
            <div className="grid gap-3 md:grid-cols-3">
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Amount"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-ledger-green/40"
              />
              <select
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value as "INR" | "USD")
                }
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-ledger-green/40"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
              <input
                type="date"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-ledger-green/40"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={paidBy}
                onChange={(event) => setPaidBy(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-ledger-green/40"
              >
                <option value="">Paid by</option>
                {expenseMembers.map((member) => (
                  <option key={member.id} value={member.user}>
                    {member.user_detail.username}
                  </option>
                ))}
              </select>
              <select
                value={splitType}
                onChange={(event) =>
                  setSplitType(event.target.value as typeof splitType)
                }
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-ledger-green/40"
              >
                <option value="EQUAL">Equal</option>
                <option value="EXACT">Exact</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="SHARE">Share</option>
              </select>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {expenseMembers.map((member) => (
                <label
                  key={member.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                >
                  <input
                    className="mr-2"
                    type="checkbox"
                    checked={participants.includes(member.user)}
                    onChange={() => toggleParticipant(member.user)}
                  />
                  {member.user_detail.username}
                </label>
              ))}
            </div>
            {!expenseMembers.length ? (
              <p className="rounded-2xl border border-ledger-amber/20 bg-ledger-amber/10 px-4 py-3 text-sm text-ledger-muted">
                No members are active on this expense date.
              </p>
            ) : null}
            <input
              value={splitValuesRaw}
              onChange={(event) => setSplitValuesRaw(event.target.value)}
              placeholder="Split details for exact, percentage, or share"
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-ledger-green/40"
            />
            <button className="rounded-2xl bg-white px-4 py-3 font-semibold text-ledger-bg">
              Create expense
            </button>
          </div>
        </form>

        <form onSubmit={handleCreateSettlement} className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-ledger-blue" />
            <h2 className="font-display text-2xl font-semibold">Record payment</h2>
          </div>
          <div className="mt-5 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={settlementFrom}
                onChange={(event) => setSettlementFrom(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-ledger-green/40"
              >
                <option value="">Paid by</option>
                {members.map((member) => (
                  <option key={member.id} value={member.user}>
                    {member.user_detail.username}
                  </option>
                ))}
              </select>
              <select
                value={settlementTo}
                onChange={(event) => setSettlementTo(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-ledger-green/40"
              >
                <option value="">Paid to</option>
                {members.map((member) => (
                  <option key={member.id} value={member.user}>
                    {member.user_detail.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={settlementAmount}
                onChange={(event) => setSettlementAmount(event.target.value)}
                placeholder="Amount in rupees"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-ledger-green/40"
              />
              <input
                type="date"
                value={settlementDate}
                onChange={(event) => setSettlementDate(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-ledger-green/40"
              />
            </div>
            <button className="rounded-2xl bg-white px-4 py-3 font-semibold text-ledger-bg">
              Record payment
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6">
          <h2 className="font-display text-2xl font-semibold">
            Committed expenses ({expenses.length})
          </h2>
          <p className="mt-2 text-sm leading-6 text-ledger-muted">
            These are real ledger expenses only. Approved import issues appear
            here only after their CSV row is committed.
          </p>

          <div className="mt-5 space-y-3">
            {expenses.map((expense) => (
              <div key={expense.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="font-semibold">{expense.description}</p>
                    <p className="mt-1 text-xs text-ledger-muted">
                      {expense.expense_date} - {expense.split_type} - paid by{" "}
                      {expense.paid_by_detail?.username ?? "Unknown"}
                    </p>
                    <p className="mt-1 text-xs text-ledger-muted">
                      {expense.source_import_row_number
                        ? `Imported from CSV row ${expense.source_import_row_number}`
                        : "Manual expense"}
                    </p>
                  </div>
                  <StatusBadge tone="green">{`Rs ${expense.amount_rupees}`}</StatusBadge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {expense.splits.map((split) => (
                    <StatusBadge key={split.id} tone="neutral">
                      {`${split.user_detail.username}: Rs ${split.owed_rupees}`}
                    </StatusBadge>
                  ))}
                </div>
              </div>
            ))}

            {!expenses.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-ledger-muted">
                No committed expenses yet.
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h2 className="font-display text-2xl font-semibold">
            Recorded payments ({settlements.length})
          </h2>
          <p className="mt-2 text-sm leading-6 text-ledger-muted">
            These are settlements/paybacks. They affect balances but are not
            split like expenses.
          </p>

          <div className="mt-5 space-y-3">
            {settlements.map((settlement) => (
              <div key={settlement.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex justify-between gap-3">
                  <p className="font-semibold">{settlement.note || "Settlement"}</p>
                  <StatusBadge tone="blue">{`Rs ${settlement.amount_rupees}`}</StatusBadge>
                </div>
                <p className="mt-1 text-xs text-ledger-muted">
                  {settlement.settlement_date} -{" "}
                  {settlement.paid_by_detail?.username ?? "Unknown"} paid{" "}
                  {settlement.paid_to_detail?.username ?? "Unknown"}
                </p>
              </div>
            ))}

            {!settlements.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-ledger-muted">
                No payments have been committed yet. CSV rows like "Rohan paid
                Aisha back" appear here only after choosing "Import as
                settlement" and resolving any other open issues on that row.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function isMemberActiveOn(member: GroupMembership, date: string) {
  if (!date) return !member.left_at;

  return member.joined_at <= date && (!member.left_at || member.left_at >= date);
}
