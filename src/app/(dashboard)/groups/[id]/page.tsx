"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
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
import { ExpenseList } from "@/components/groups/ExpenseList";

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

type Tab = "expenses" | "balances" | "settlements";

type MutationResult = { ok: true } | { ok: false; error: string };

const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again. Your entry has been kept.";

/** Reads a user-facing message from a failed API response. */
async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    const issue = Array.isArray(data?.details) ? data.details[0] : undefined;
    if (data?.error === "Validation failed" && issue?.message) {
      const field = Array.isArray(issue.path) && issue.path.length ? `${issue.path.join(".")}: ` : "";
      return `${field}${issue.message}`;
    }
    return data?.error ?? fallback;
  } catch {
    return fallback;
  }
}

function initials(name: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const memberId = (m: Member) => m.userId ?? m.user?.id ?? "";
const memberName = (m: Member) => m.name ?? m.user?.name ?? "";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const currency = session?.user?.currency ?? "INR";
  const userId = session?.user?.id;
  const { addToast } = useToast();

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
  // null = automatic: open when the group has no expenses yet
  const [showAddForm, setShowAddForm] = useState<boolean | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  // Mutation state: which action is in flight, plus inline form errors
  const [pending, setPending] = useState<string | null>(null);
  const inFlight = useRef(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const settlePrefilled = useRef(false);
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

  async function addExpense(payload: ExpensePayload): Promise<boolean> {
    setExpenseError(null);
    const result = await runMutation(
      "expense",
      () =>
        fetch(`/api/groups/${id}/expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      "Couldn't add the expense.",
    );
    if (!result) return false;
    if (!result.ok) {
      // The form keeps everything the user typed so they can fix it and retry
      setExpenseError(result.error);
      return false;
    }
    addToast("Expense added");
    await refresh();
    return true;
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
  ];

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  const memberList: Member[] = members.length > 0
    ? members
    : balances.map((b) => ({ userId: b.userId, name: b.name }));
  const formMembers = memberList.map((m) => ({ id: memberId(m), name: memberName(m) }));
  const addFormOpen = showAddForm ?? expenses.length === 0;

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

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header: one overflow menu instead of a row of buttons (destructive actions live in Group settings) */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">Pocket Detail Panel</span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1 break-words">{group?.name ?? "Pocket Details"}</h1>
          <p className="text-xs text-muted mt-1 font-normal">{group?.description ?? "Manage shared expenses and settlements"}</p>
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

      {/* macOS segmented control tab bar */}
      <div className="flex bg-[#F5F5F7] dark:bg-[#1C1C1E] p-0.5 rounded-lg inline-flex select-none border border-[#E8E8ED]/30 dark:border-[#2C2C2E]/20">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${
              tab === t.key
                ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Expenses */}
      {tab === "expenses" && (
        <div className="space-y-6">
          {/* At-a-glance summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 sm:p-4">
              <p className="text-xs font-medium text-[var(--foreground-muted)]">Group spend</p>
              <p className="mt-1 text-lg font-bold tabular-nums sm:text-xl text-[var(--foreground)]">{formatCurrency(totalSpend, currency)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 sm:p-4">
              <p className="text-xs font-medium text-[var(--foreground-muted)]">This month</p>
              <p className="mt-1 text-lg font-bold tabular-nums sm:text-xl text-[var(--foreground)]">{formatCurrency(thisMonthSpend, currency)}</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 sm:col-span-1 sm:p-4">
              <p className="text-xs font-medium text-[var(--foreground-muted)]">Your balance</p>
              <p className={`mt-1 text-lg font-bold tabular-nums sm:text-xl ${myBalanceTone}`}>{myBalanceText}</p>
            </div>
          </div>

          {/* The add form stays tucked away until needed, so the list is visible first */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Expenses</h2>
            {!addFormOpen && (
              <Button onClick={() => setShowAddForm(true)} aria-expanded={false} aria-controls="add-expense-panel">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New expense
              </Button>
            )}
          </div>

          {addFormOpen && (
            <Card className="animate-fade-in">
              <div id="add-expense-panel">
                <CardHeader
                  title="Add an expense"
                  description="Enter the total, who paid, and who it is shared with."
                  action={
                    expenses.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} aria-label="Close add expense form">
                        Close
                      </Button>
                    )
                  }
                />
                <CardBody>
                  <ExpenseForm
                    members={formMembers}
                    currentUserId={userId}
                    currency={currency}
                    submitLabel="Add Expense"
                    pending={pending === "expense"}
                    error={expenseError}
                    onSubmit={addExpense}
                    resetOnSuccess
                  />
                </CardBody>
              </div>
            </Card>
          )}

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
        </div>
      )}

      {/* Tab: Balances */}
      {tab === "balances" && (
        <div className="space-y-6">
          <Card padding="md" className="hover-lift transition-all duration-300">
            <p className="text-[9px] font-semibold text-muted uppercase tracking-widest">Total Group Spend</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] dark:text-white leading-none">{formatCurrency(totalSpend, currency)}</p>
          </Card>

          <Card>
            <CardHeader title="Member Balances" description="Positive = owed to them, Negative = they owe" />
            <CardBody>
              <div className="space-y-3.5 divide-y divide-[#E8E8ED]/60 dark:divide-[#2C2C2E]/40">
                {balances.map((b) => (
                  <div key={b.userId} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <span className="text-foreground font-medium text-sm">{b.name}</span>
                    <span className={`font-semibold ${b.balance >= 0 ? "text-income" : "text-expense"}`}>
                      {formatCurrency(b.balance, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Simplified Debts" />
            <CardBody>
              {debts.length === 0 ? (
                <p className="text-muted text-xs">All settled up!</p>
              ) : (
                <div className="space-y-3">
                  {debts.map((d, i) => (
                    <div key={i} className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold text-expense">{d.fromName}</span> owes{" "}
                        <span className="font-semibold text-income">{d.toName}</span>{" "}
                        <span className="font-bold text-[#1D1D1F] dark:text-white ml-1">{formatCurrency(d.amount, currency)}</span>
                      </p>
                      {d.fromId === userId && (
                        <Button size="sm" onClick={() => startSettleUp(d)}>
                          Settle up
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tab: Settlements */}
      {tab === "settlements" && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Record Payment" />
            <CardBody>
              <form onSubmit={recordSettlement} noValidate className="grid gap-4 sm:grid-cols-3">
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
                <div className="flex items-end">
                  <Button type="submit" loading={pending === "settle"} disabled={pending !== null && pending !== "settle"}>
                    Record
                  </Button>
                </div>
                {settleHint && (
                  <p className="sm:col-span-3 text-xs text-[var(--warning)]">{settleHint}</p>
                )}
                {settleError && (
                  <p role="alert" className="sm:col-span-3 text-xs font-medium text-[var(--expense)]">{settleError}</p>
                )}
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pocket Members" />
            <CardBody>
              <div className="space-y-3.5 divide-y divide-[#E8E8ED]/60 dark:divide-[#2C2C2E]/40">
                {memberList.map((m) => {
                  const uid = memberId(m);
                  const photo = m.user?.profilePhoto;
                  const initialsName = memberName(m);
                  return (
                    <div key={uid} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        {photo ? (
                          <img
                            src={photo}
                            alt={initialsName}
                            className="h-8 w-8 rounded-full object-cover border border-[#E8E8ED] dark:border-[#2C2C2E]"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-[10px] font-bold border border-accent/20 ring-1 ring-accent/15 select-none">
                            {initials(initialsName)}
                          </div>
                        )}
                        <span className="text-foreground text-sm font-medium">{initialsName}</span>
                      </div>
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
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Settlement History" />
            <CardBody>
              {settlements.length === 0 ? (
                <p className="text-muted text-xs">No settlements recorded.</p>
              ) : (
                <div className="space-y-2">
                  {settlements.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm border-b border-[#E8E8ED]/60 dark:border-[#2C2C2E]/40 py-2.5 last:border-b-0 last:pb-0">
                      <span className="text-foreground">
                        {s.from.name} paid {s.to.name}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-income">{formatCurrency(s.amount, currency)}</span>
                        <span className="text-xs text-muted">{format(new Date(s.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
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
        title="Download Pocket Expense Report"
        size="sm"
      >
        <div className="space-y-4">
          {reportError && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded-lg border border-red-200 dark:border-red-800">
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
