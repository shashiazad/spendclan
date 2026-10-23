"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatCurrency } from "@/lib/constants";
import { format } from "date-fns";
import { MemberSearch, type SelectedMember } from "@/components/ui/MemberSearch";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { useToast } from "@/components/ui/Toast";
import { ExpenseForm, type ExpensePayload } from "@/components/groups/ExpenseForm";
import { useAddExpense } from "@/components/groups/AddExpenseProvider";
import { NETWORK_ERROR, readError } from "@/lib/api-errors";
import { ExpenseList } from "@/components/groups/ExpenseList";
import { GroupExpenseSearch } from "@/components/groups/GroupExpenseSearch";
import { ActivityPanel, useActivity } from "@/components/activity/ActivityFeed";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { BentoGrid, BentoTile } from "@/components/ui/Bento";
import { SegmentedControl } from "@/components/ui/Tabs";

const monthsList = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("default", { month: "long" }),
}));

const yearsList = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i;
  return { value: String(y), label: String(y) };
});

type Member = {
  userId: string;
  name: string;
  role?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    profilePhoto?: string | null;
  };
};
type Expense = {
  id: string;
  amount: number;
  description: string;
  date: string;
  splitType: string;
  canEdit?: boolean;
  paidBy: { id: string; name: string };
  splits: { amount: number; user: { id: string; name: string } }[];
};
type Balance = { userId: string; name: string; balance: number };
type Debt = { fromId: string; fromName: string; toId: string; toName: string; amount: number };
type Settlement = {
  id: string;
  amount: number;
  createdAt: string;
  from: { id: string; name: string };
  to: { id: string; name: string };
};

type Tab = "expenses" | "balances" | "settlements" | "members";

type MutationResult = { ok: true } | { ok: false; error: string };

const memberId = (m: Member) => m.userId ?? m.user?.id ?? "";
const memberName = (m: Member) => m.name ?? m.user?.name ?? "";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const currency = session?.user?.currency ?? "INR";
  const userId = session?.user?.id;
  const { addToast } = useToast();
  const { openAddExpense, onExpenseAdded } = useAddExpense();

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPeriodType, setReportPeriodType] = useState<"all-time" | "monthly">("all-time");
  const [reportMonth, setReportMonth] = useState(String(new Date().getMonth() + 1));
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  async function handleDownloadReport() {
    setDownloadingReport(true);
    setReportError(null);
    try {
      let queryParams = "";
      if (reportPeriodType === "monthly") {
        queryParams = `?month=${reportMonth}&year=${reportYear}`;
      }

      const res = await fetch(`/api/reports/group/${id}${queryParams}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch group report data");
      }
      const reportData = await res.json();

      const { generateIndividualGroupPDF } = await import("@/lib/pdf-generator");
      await generateIndividualGroupPDF(reportData, currency);
      setShowReportModal(false);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to generate group report";
      setReportError(errorMsg);
    } finally {
      setDownloadingReport(false);
    }
  }

  const [tab, setTab] = useState<Tab>("expenses");
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<{ id: string; name: string; description?: string; members?: { userId: string; role: string }[] } | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [totalSpend, setTotalSpend] = useState(0);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const [settleForm, setSettleForm] = useState({ amount: "", toId: "" });
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState<SelectedMember[]>([]);

  // Dialogs
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  // Mutation state: which action is in flight, plus inline form errors
  const [pending, setPending] = useState<string | null>(null);
  const inFlight = useRef(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const settlePrefilled = useRef(false);
  // Group activity reloads with the rest of the group's data (every refresh sets a new expenses array)
  const groupActivity = useActivity({ groupId: id, limit: 10, refreshKey: expenses });
  const settleAmountRef = useRef<HTMLInputElement>(null);

  const loadGroup = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}`);
    const data = await res.json();
    if (data.group) {
      setGroup(data.group);
    }
  }, [id]);

  const loadExpenses = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}/expenses`);
    const data = await res.json();
    setExpenses(data.expenses ?? []);
  }, [id]);

  const loadBalances = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}/balance`);
    const data = await res.json();
    setBalances(data.balances ?? []);
    setDebts(data.simplifiedDebts ?? []);
    setTotalSpend(data.totalSpend ?? 0);
  }, [id]);

  const loadSettlements = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}/settle`);
    const data = await res.json();
    setSettlements(data.settlements ?? []);
    setMembers(data.members ?? []);
  }, [id]);

  // Reloads data in place, without the full-page spinner, so forms keep focus after a change
  const refresh = useCallback(async () => {
    await Promise.all([loadGroup(), loadExpenses(), loadBalances(), loadSettlements()]);
  }, [loadGroup, loadExpenses, loadBalances, loadSettlements]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await refresh();
    setLoading(false);
  }, [refresh]);

  /**
   * Runs one mutation at a time and reports whether it succeeded.
   * Returns null when ignored because another request is still in flight (double-tap, Enter + click).
   */
  async function runMutation(
    key: string,
    request: () => Promise<Response>,
    fallback: string,
  ): Promise<MutationResult | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    setPending(key);
    try {
      const res = await request();
      if (!res.ok) return { ok: false, error: await readError(res, fallback) };
      return { ok: true };
    } catch {
      return { ok: false, error: NETWORK_ERROR };
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadAll();
    });
    return () => {
      active = false;
    };
  }, [loadAll]);

  // Expenses are added from the shared dialog (header button or floating +); refresh when one lands here
  useEffect(() => onExpenseAdded((groupId) => {
    if (groupId === id) refresh();
  }), [onExpenseAdded, id, refresh]);

  // Everyone who can appear on an expense: current members plus anyone already on one
  const searchPeople = (() => {
    const map = new Map<string, string>();
    for (const m of members) map.set(memberId(m), m.user?.name ?? m.name);
    for (const e of expenses) {
      map.set(e.paidBy.id, map.get(e.paidBy.id) ?? e.paidBy.name);
      for (const sp of e.splits) map.set(sp.user.id, map.get(sp.user.id) ?? sp.user.name);
    }
    return [...map].map(([pid, name]) => ({ id: pid, name }));
  })();

  const currentMember = group?.members?.find((m) => m.userId === userId);
  const isAdmin = currentMember?.role === "ADMIN";

  // Prefill "Record payment" with the largest amount the current user owes an active member
  useEffect(() => {
    if (settlePrefilled.current || !userId) return;
    const activeIds = new Set(members.map(memberId));
    const myDebt = debts
      .filter((d) => d.fromId === userId && activeIds.has(d.toId))
      .sort((a, b) => b.amount - a.amount)[0];
    if (!myDebt) return;
    settlePrefilled.current = true;
    Promise.resolve().then(() => {
      setSettleForm((f) => (f.toId || f.amount ? f : { toId: myDebt.toId, amount: myDebt.amount.toFixed(2) }));
    });
  }, [debts, members, userId]);

  async function deleteGroup() {
    const result = await runMutation(
      "delete-group",
      () => fetch(`/api/groups/${id}`, { method: "DELETE" }),
      "Couldn't delete the group.",
    );
    if (!result) return;
    if (!result.ok) {
      addToast(result.error, "error");
      return;
    }
    setConfirmDeleteGroup(false);
    router.push("/groups");
  }

  async function saveEdit(payload: ExpensePayload): Promise<boolean> {
    if (!editing) return false;
    setEditError(null);
    const result = await runMutation(
      `edit-expense:${editing.id}`,
      () =>
        fetch(`/api/groups/${id}/expenses?id=${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      "Couldn't save the expense.",
    );
    if (!result) return false;
    if (!result.ok) {
      setEditError(result.error);
      return false;
    }
    setEditing(null);
    addToast("Expense updated");
    await refresh();
    return true;
  }

  async function restoreExpense(expenseId: string) {
    const result = await runMutation(
      `restore-expense:${expenseId}`,
      () =>
        fetch(`/api/groups/${id}/expenses/restore`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: expenseId }),
        }),
      "Couldn't restore the expense.",
    );
    if (!result) return;
    if (!result.ok) {
      addToast(result.error, "error");
      return;
    }
    addToast("Expense restored");
    await refresh();
  }

  async function deleteExpense(expense: Expense) {
    const result = await runMutation(
      `delete-expense:${expense.id}`,
      () => fetch(`/api/groups/${id}/expenses?id=${expense.id}`, { method: "DELETE" }),
      "Couldn't delete the expense.",
    );
    setExpenseToDelete(null);
    if (!result) return;
    if (!result.ok) {
      addToast(result.error, "error");
      return;
    }
    addToast(`Deleted "${expense.description}"`, "success", {
      action: { label: "Undo", onClick: () => restoreExpense(expense.id) },
    });
    await refresh();
  }

  /** "Settle up" on a debt row: prefill the payment form and jump to it. */
  function startSettleUp(debt: Debt) {
    settlePrefilled.current = true;
    setSettleError(null);
    setSettleForm({ toId: debt.toId, amount: debt.amount.toFixed(2) });
    setTab("settlements");
    requestAnimationFrame(() => settleAmountRef.current?.focus());
  }

  // Links from Home and Balances: ?settle=<person> opens a prefilled payment, ?invite=1 opens Add member
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (loading || deepLinkHandled.current || !userId) return;
    deepLinkHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    const settleTo = params.get("settle");
    const invite = params.get("invite") === "1";
    if (!settleTo && !invite) return;
    params.delete("settle");
    params.delete("invite");
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    Promise.resolve().then(() => {
      if (invite) setShowAddMember(true);
      if (settleTo) {
        const debt = debts.find((d) => d.fromId === userId && d.toId === settleTo);
        if (debt) startSettleUp(debt);
        else {
          settlePrefilled.current = true;
          setSettleForm({ toId: settleTo, amount: "" });
          setTab("settlements");
        }
      }
    });
  }, [loading, debts, userId]);

  async function recordSettlement(e: React.FormEvent) {
    e.preventDefault();
    setSettleError(null);

    const amount = Number(settleForm.amount);
    if (!settleForm.toId) {
      setSettleError("Choose who you paid.");
      return;
    }
    if (!(amount > 0)) {
      setSettleError("Enter an amount greater than 0.");
      return;
    }

    const result = await runMutation(
      "settle",
      () =>
        fetch(`/api/groups/${id}/settle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, toId: settleForm.toId }),
        }),
      "Couldn't record the payment.",
    );
    if (!result) return;
    if (!result.ok) {
      setSettleError(result.error);
      return;
    }

    setSettleForm({ amount: "", toId: "" });
    settlePrefilled.current = false;
    addToast("Payment recorded");
    await refresh();
  }

  /** Returns true when the member was added, so the dialog only closes on success. */
  async function addMember(e: React.FormEvent): Promise<boolean> {
    e.preventDefault();
    if (selectedMemberToAdd.length === 0) return false;
    const member = selectedMemberToAdd[0];

    const result = await runMutation(
      "add-member",
      () =>
        fetch(`/api/groups/${id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: member.id,
            email: member.email,
          }),
        }),
      "Couldn't add the member.",
    );
    if (!result) return false;
    if (!result.ok) {
      addToast(result.error, "error");
      return false;
    }
    setSelectedMemberToAdd([]);
    addToast("Member added");
    await refresh();
    return true;
  }

  async function removeMember(member: Member) {
    const uid = memberId(member);
    const result = await runMutation(
      `remove-member:${uid}`,
      () => fetch(`/api/groups/${id}/members?userId=${uid}`, { method: "DELETE" }),
      "Couldn't remove the member.",
    );
    setMemberToRemove(null);
    if (!result) return;
    if (!result.ok) {
      addToast(result.error, "error");
      return;
    }
    addToast(`${memberName(member)} removed`);
    await refresh();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "expenses", label: "Expenses" },
    { key: "balances", label: "Balances" },
    { key: "settlements", label: "Settlements" },
    { key: "members", label: "Members" },
  ];

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  const memberList: Member[] = members.length > 0
    ? members
    : balances.map((b) => ({ userId: b.userId, name: b.name }));
  const formMembers = memberList.map((m) => ({ id: memberId(m), name: memberName(m) }));

  // Summary figures for the Expenses tab
  const monthKey = format(new Date(), "yyyy-MM");
  const thisMonthSpend = expenses
    .filter((e) => format(new Date(e.date), "yyyy-MM") === monthKey)
    .reduce((sum, e) => sum + e.amount, 0);
  const myBalance = balances.find((b) => b.userId === userId)?.balance ?? 0;
  const myBalanceText =
    myBalance > 0.004
      ? `You're owed ${formatCurrency(myBalance, currency)}`
      : myBalance < -0.004
        ? `You owe ${formatCurrency(-myBalance, currency)}`
        : "All settled up";
  const myBalanceTone =
    myBalance > 0.004 ? "text-[var(--income)]" : myBalance < -0.004 ? "text-[var(--expense)]" : "text-[var(--foreground)]";

  // What the current user owes the selected payee, for "Full amount" and the overpay warning
  const payee = memberList.find((m) => memberId(m) === settleForm.toId);
  const owedToPayee = debts.find((d) => d.fromId === userId && d.toId === settleForm.toId)?.amount;
  const settleAmount = Number(settleForm.amount) || 0;
  let settleHint: string | null = null;
  if (payee && owedToPayee === undefined) {
    settleHint = `You don't owe ${memberName(payee)} anything right now. This will be recorded as a payment to them.`;
  } else if (payee && owedToPayee !== undefined && settleAmount - owedToPayee > 0.005) {
    settleHint = `That's ${formatCurrency(settleAmount - owedToPayee, currency)} more than you owe ${memberName(payee)}.`;
  }

  const menuItems = [
    { label: "Add member", onSelect: () => setShowAddMember(true) },
    {
      label: "Download report",
      onSelect: () => {
        setReportPeriodType("all-time");
        setReportError(null);
        setShowReportModal(true);
      },
    },
    ...(isAdmin ? [{ label: "Group settings", onSelect: () => setShowSettings(true) }] : []),
  ];

  const myDebts = debts.filter((d) => d.fromId === userId).sort((a, b) => b.amount - a.amount);
  const balanceSign = myBalance > 0.004 ? "+" : myBalance < -0.004 ? "−" : "✓";
  const memberPeople = memberList.map((m) => ({ id: memberId(m), name: memberName(m), profilePhoto: m.user?.profilePhoto ?? null }));

  return (
    <div className="mx-auto max-w-screen-xl space-y-6 animate-fade-in">
      <BentoGrid>
        {/* Header: one overflow menu instead of a row of buttons (destructive actions live in Group settings) */}
        <BentoTile span={3} lgSpan={2}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--foreground-subtle)]">Group</p>
              <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">{group?.name ?? "Group"}</h1>
              {group?.description && <p className="mt-1 text-sm text-[var(--foreground-muted)]">{group.description}</p>}
            </div>
            <DropdownMenu
              label="Group actions"
              items={menuItems}
              trigger={
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              }
            />
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
            <AvatarStack people={memberPeople} max={5} size="md" />
            <span className="text-sm text-[var(--foreground-muted)]">
              {memberList.length} {memberList.length === 1 ? "member" : "members"}
            </span>
          </div>
        </BentoTile>

        {/* Your balance (hero) */}
        <BentoTile title="Your balance" tone="hero" span={2} lgSpan={1}>
          <p className={`flex items-baseline gap-1.5 text-2xl font-bold tracking-tight money sm:text-3xl ${myBalanceTone}`}>
            <span aria-hidden="true" className="text-xl">{balanceSign}</span>
            {myBalanceText}
          </p>
          {myDebts.length > 0 && (
            <button
              type="button"
              onClick={() => startSettleUp(myDebts[0])}
              className="mt-auto inline-flex min-h-[44px] items-center self-start rounded-xl bg-accent-gradient px-4 text-sm font-medium text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            >
              Pay what you owe
            </button>
          )}
        </BentoTile>

        {/* Spend */}
        <BentoTile title="Spending">
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-1">
            <div>
              <dt className="text-xs text-[var(--foreground-muted)]">Group spend</dt>
              <dd className="text-xl font-bold text-[var(--foreground)] money">{formatCurrency(totalSpend, currency)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--foreground-muted)]">This month</dt>
              <dd className="text-xl font-bold text-[var(--foreground)] money">{formatCurrency(thisMonthSpend, currency)}</dd>
            </div>
          </dl>
        </BentoTile>
      </BentoGrid>

      <SegmentedControl label="Group sections" items={tabs.map((t) => ({ id: t.key, label: t.label }))} value={tab} onChange={(t) => setTab(t as Tab)} />

      {/* Tab: Expenses */}
      {tab === "expenses" && (
        <section aria-label="Expenses" className="card space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Expenses</h2>
            {expenses.length > 0 && (
              <Button onClick={() => openAddExpense(id)}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New expense
              </Button>
            )}
          </div>

          {expenses.length === 0 ? (
            <ExpenseList
              expenses={expenses}
              currency={currency}
              currentUserId={userId}
              pending={pending}
              emptyAction={<Button onClick={() => openAddExpense(id)}>Add the first expense</Button>}
            />
          ) : (
            <GroupExpenseSearch
              groupId={id}
              people={searchPeople}
              currentUserId={userId}
              currency={currency}
              pending={pending}
              onEdit={(exp) => {
                setEditError(null);
                setEditing(exp as Expense);
              }}
              onDelete={(exp) => setExpenseToDelete(exp as Expense)}
              refreshKey={expenses}
            >
              <ExpenseList
                expenses={expenses}
                currency={currency}
                currentUserId={userId}
                pending={pending}
                onEdit={(exp) => {
                  setEditError(null);
                  setEditing(exp);
                }}
                onDelete={(exp) => setExpenseToDelete(exp)}
              />
            </GroupExpenseSearch>
          )}
        </section>
      )}

      {/* Tab: Balances */}
      {tab === "balances" && (
        <BentoGrid>
          <BentoTile title="Suggested payments" span={2} lgSpan={2}>
            {debts.length === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">All settled up!</p>
            ) : (
              <ul className="space-y-3">
                {debts.map((d, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface)] px-3 py-2.5">
                    <p className="text-sm text-[var(--foreground)]">
                      <span className="font-semibold">{d.fromId === userId ? "You" : d.fromName}</span> {d.fromId === userId ? "owe" : "owes"}{" "}
                      <span className="font-semibold">{d.toId === userId ? "you" : d.toName}</span>{" "}
                      <span className="ml-1 font-bold money">{formatCurrency(d.amount, currency)}</span>
                    </p>
                    {d.fromId === userId && (
                      <Button size="sm" onClick={() => startSettleUp(d)}>
                        Settle up
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </BentoTile>

          <BentoTile title="Member balances" lgSpan={2} rows={2}>
            <p className="mb-3 text-xs text-[var(--foreground-muted)]">+ is owed money, − owes money</p>
            <ul className="divide-y divide-[var(--border)]">
              {balances.map((b) => {
                const person = memberPeople.find((p) => p.id === b.userId) ?? { id: b.userId, name: b.name };
                return (
                  <li key={b.userId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar person={person} size="sm" />
                      <span className="truncate text-sm font-medium text-[var(--foreground)]">{b.userId === userId ? "You" : b.name}</span>
                    </span>
                    <span
                      className={`text-sm font-semibold money ${
                        b.balance > 0.004 ? "text-[var(--owed)]" : b.balance < -0.004 ? "text-[var(--owe)]" : "text-[var(--foreground-muted)]"
                      }`}
                    >
                      {b.balance > 0.004 ? "+" : b.balance < -0.004 ? "−" : ""}
                      {formatCurrency(Math.abs(b.balance), currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </BentoTile>

          <BentoTile title="Recent activity" span={2} lgSpan={2}>
            <ActivityPanel activity={groupActivity} currentUserId={userId} currency={currency} hideGroup />
          </BentoTile>
        </BentoGrid>
      )}

      {/* Tab: Settlements */}
      {tab === "settlements" && (
        <BentoGrid>
          <BentoTile title="Record payment" span={3} lgSpan={2}>
            <form onSubmit={recordSettlement} noValidate className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Pay To"
                placeholder="Select a person"
                value={settleForm.toId}
                onChange={(e) => {
                  const toId = e.target.value;
                  const owed = debts.find((d) => d.fromId === userId && d.toId === toId)?.amount;
                  // Fill in what is owed to the new person unless the user already typed an amount
                  setSettleForm((f) => ({ toId, amount: f.amount || (owed ? owed.toFixed(2) : "") }));
                }}
                options={memberList.filter((m) => memberId(m) !== userId).map((m) => ({ value: memberId(m), label: memberName(m) }))}
              />
              <div className="space-y-1.5">
                <Input
                  ref={settleAmountRef}
                  label="Amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={settleForm.amount}
                  onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
                />
                {owedToPayee !== undefined && (
                  <button
                    type="button"
                    onClick={() => setSettleForm({ ...settleForm, amount: owedToPayee.toFixed(2) })}
                    className="min-h-[32px] text-xs font-semibold text-[var(--accent)]"
                  >
                    Full amount ({formatCurrency(owedToPayee, currency)})
                  </button>
                )}
              </div>
              {settleHint && <p className="sm:col-span-2 text-xs text-[var(--warning)]">{settleHint}</p>}
              {settleError && (
                <p role="alert" className="sm:col-span-2 text-xs font-medium text-[var(--expense)]">{settleError}</p>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" loading={pending === "settle"} disabled={pending !== null && pending !== "settle"}>
                  Record
                </Button>
              </div>
            </form>
          </BentoTile>

          <BentoTile title="Settlement history" span={3} lgSpan={2}>
            {settlements.length === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">No settlements recorded.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {settlements.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="text-[var(--foreground)]">
                      {s.from.name} paid {s.to.name}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold text-[var(--foreground)] money">{formatCurrency(s.amount, currency)}</span>
                      <span className="text-xs text-[var(--foreground-subtle)]">{format(new Date(s.createdAt), "MMM d, yyyy")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </BentoTile>
        </BentoGrid>
      )}

      {/* Tab: Members */}
      {tab === "members" && (
        <section aria-label="Members" className="card p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Group Members</h2>
            <Button variant="secondary" size="sm" onClick={() => setShowAddMember(true)}>Add member</Button>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {memberList.map((m) => {
              const uid = memberId(m);
              return (
                <li key={uid} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar person={{ id: uid, name: memberName(m), profilePhoto: m.user?.profilePhoto }} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[var(--foreground)]">{memberName(m)}{uid === userId ? " (you)" : ""}</span>
                      {m.role === "ADMIN" && <span className="text-xs text-[var(--foreground-subtle)]">Admin</span>}
                    </span>
                  </span>
                  {isAdmin && uid !== userId && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setMemberToRemove(m)}
                      loading={pending === `remove-member:${uid}`}
                      disabled={pending !== null}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Edit expense */}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit expense" size="lg">
        {editing && (
          <ExpenseForm
            key={editing.id}
            members={formMembers}
            currentUserId={userId}
            currency={currency}
            initial={editing}
            submitLabel="Save changes"
            pending={pending === `edit-expense:${editing.id}`}
            error={editError}
            onSubmit={saveEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={expenseToDelete !== null}
        title="Delete expense?"
        message={
          expenseToDelete && (
            <>
              <strong className="text-[var(--foreground)]">{expenseToDelete.description}</strong> (
              {formatCurrency(expenseToDelete.amount, currency)}) will be removed from balances. You can undo this right after.
            </>
          )
        }
        confirmLabel="Delete"
        tone="danger"
        loading={expenseToDelete !== null && pending === `delete-expense:${expenseToDelete.id}`}
        onConfirm={() => expenseToDelete && deleteExpense(expenseToDelete)}
        onCancel={() => setExpenseToDelete(null)}
      />

      <ConfirmDialog
        open={memberToRemove !== null}
        title="Remove member?"
        message={
          memberToRemove && (
            <>
              <strong className="text-[var(--foreground)]">{memberName(memberToRemove)}</strong> will lose access to this group.
              Their expenses and balance stay in the group.
            </>
          )
        }
        confirmLabel="Remove"
        tone="danger"
        loading={memberToRemove !== null && pending === `remove-member:${memberId(memberToRemove)}`}
        onConfirm={() => memberToRemove && removeMember(memberToRemove)}
        onCancel={() => setMemberToRemove(null)}
      />

      {/* Add member */}
      <Modal
        open={showAddMember}
        onClose={() => {
          setSelectedMemberToAdd([]);
          setShowAddMember(false);
        }}
        title="Add member"
        size="sm"
      >
        <form
          onSubmit={async (e) => {
            if (await addMember(e)) setShowAddMember(false);
          }}
          className="space-y-4 min-h-[16rem]"
        >
          <MemberSearch
            selectedMembers={selectedMemberToAdd}
            onAddMember={(member) => setSelectedMemberToAdd([member])}
            onRemoveMember={() => setSelectedMemberToAdd([])}
            excludeEmails={
              session?.user?.email
                ? [session.user.email, ...memberList.map((m) => m.user?.email || "").filter(Boolean)]
                : memberList.map((m) => m.user?.email || "").filter(Boolean)
            }
            placeholder="Search by name or type email..."
            singleSelect={true}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedMemberToAdd([]);
                setShowAddMember(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={pending === "add-member"} disabled={selectedMemberToAdd.length === 0}>
              Add
            </Button>
          </div>
        </form>
      </Modal>

      {/* Group settings with the danger zone (admins only) */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Group settings" size="sm">
        <div className="space-y-5 text-sm">
          <div>
            <p className="text-xs text-[var(--foreground-muted)]">Name</p>
            <p className="font-medium text-[var(--foreground)]">{group?.name}</p>
          </div>
          <section aria-labelledby="danger-zone-title" className="space-y-3 rounded-xl border border-[var(--expense)]/40 p-4">
            <h3 id="danger-zone-title" className="text-sm font-semibold text-[var(--expense)]">Danger zone</h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              Deleting the group removes it for every member. Its expenses and settlements are archived, not erased.
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                // Close settings first so only one dialog is open at a time
                setShowSettings(false);
                setConfirmDeleteGroup(true);
              }}
            >
              Delete group…
            </Button>
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteGroup}
        title="Delete this group?"
        message="Everyone will lose access to this group. Its expenses and settlements are archived, not erased."
        confirmLabel="Delete group"
        tone="danger"
        requireText={group?.name}
        loading={pending === "delete-group"}
        onConfirm={deleteGroup}
        onCancel={() => setConfirmDeleteGroup(false)}
      />

      {/* Report Modal */}
      <Modal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Download Group Expense Report"
        size="sm"
      >
        <div className="space-y-4">
          {reportError && (
            <div className="text-xs text-[var(--expense)] bg-[var(--expense-dim)] dark:bg-[var(--expense-dim)] p-2 rounded-lg border border-[var(--expense)]/30 dark:border-[var(--expense)]/30">
              {reportError}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
              Reporting Period
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportPeriodType("all-time")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  reportPeriodType === "all-time"
                    ? "bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--sidebar-hover)]"
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setReportPeriodType("monthly")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  reportPeriodType === "monthly"
                    ? "bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--sidebar-hover)]"
                }`}
              >
                Specific Month
              </button>
            </div>
          </div>

          {reportPeriodType === "monthly" && (
            <div className="grid grid-cols-2 gap-3 animate-slide-down">
              <Select
                label="Month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                options={monthsList}
              />
              <Select
                label="Year"
                value={reportYear}
                onChange={(e) => setReportYear(e.target.value)}
                options={yearsList}
              />
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={handleDownloadReport}
              className="w-full text-xs font-semibold"
              loading={downloadingReport}
            >
              Generate & Download PDF
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
