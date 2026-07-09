"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SPLIT_TYPES, formatCurrency } from "@/lib/constants";
import { format } from "date-fns";
import { MemberSearch, type SelectedMember } from "@/components/ui/MemberSearch";
import { Modal } from "@/components/ui/Modal";

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

function initials(name: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const currency = session?.user?.currency ?? "INR";
  const userId = session?.user?.id;

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
    } catch (e: any) {
      setReportError(e.message || "Failed to generate group report");
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

  const [expForm, setExpForm] = useState({
    amount: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    splitType: "EQUAL",
    paidById: "",
    splits: {} as Record<string, string>,
  });
  const [settleForm, setSettleForm] = useState({ amount: "", toId: "" });
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState<SelectedMember[]>([]);

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

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadGroup(), loadExpenses(), loadBalances(), loadSettlements()]);
    setLoading(false);
  }, [loadGroup, loadExpenses, loadBalances, loadSettlements]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function deleteGroup() {
    if (!confirm("Are you sure you want to delete this pocket? This action is permanent and will delete all expenses and settlements in this pocket.")) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/groups");
      } else {
        const err = await res.json();
        alert(err.error ?? "Failed to delete pocket");
      }
    } catch {
      alert("Failed to delete pocket. Please try again.");
    }
  }

  const currentMember = group?.members?.find((m) => m.userId === userId);
  const isAdmin = currentMember?.role === "ADMIN";

  useEffect(() => {
    if (members.length > 0 && !expForm.paidById) {
      setExpForm((f) => ({ ...f, paidById: userId ?? members[0].userId ?? members[0].user?.id ?? "" }));
    }
  }, [members, userId, expForm.paidById]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const memberIds = members.map((m) => m.userId ?? m.user?.id ?? "");
    let splits;
    if (expForm.splitType !== "EQUAL") {
      if (expForm.splitType === "PERCENTAGE") {
        const totalAmount = Number(expForm.amount);
        const totalCents = Math.round(totalAmount * 100);
        let computedCentsSum = 0;
        const tempSplits = memberIds.map((uid) => {
          const val = Number(expForm.splits[uid] ?? 0);
          const shareCents = Math.round((val / 100) * totalCents);
          computedCentsSum += shareCents;
          return {
            userId: uid,
            cents: shareCents,
            percentage: val,
          };
        });
        const remainderCents = totalCents - computedCentsSum;
        if (remainderCents !== 0 && tempSplits.length > 0) {
          const payerIdx = tempSplits.findIndex((s) => s.userId === expForm.paidById);
          const target = payerIdx !== -1 ? tempSplits[payerIdx] : tempSplits[0];
          target.cents += remainderCents;
        }
        splits = tempSplits.map((s) => ({
          userId: s.userId,
          amount: s.cents / 100,
          percentage: s.percentage,
        }));
      } else {
        splits = memberIds.map((uid) => ({
          userId: uid,
          amount: Number(expForm.splits[uid] ?? 0),
        }));
      }
    }

    await fetch(`/api/groups/${id}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(expForm.amount),
        description: expForm.description,
        date: expForm.date,
        splitType: expForm.splitType,
        paidById: expForm.paidById,
        splits,
      }),
    });
    setExpForm({
      amount: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
      splitType: "EQUAL",
      paidById: userId ?? "",
      splits: {},
    });
    loadAll();
  }

  async function deleteExpense(expenseId: string) {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/groups/${id}/expenses?id=${expenseId}`, { method: "DELETE" });
    loadAll();
  }

  async function recordSettlement(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/groups/${id}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(settleForm.amount), toId: settleForm.toId }),
    });
    setSettleForm({ amount: "", toId: "" });
    loadAll();
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (selectedMemberToAdd.length === 0) return;
    const member = selectedMemberToAdd[0];

    const res = await fetch(`/api/groups/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: member.id,
        email: member.email,
      }),
    });
    if (res.ok) {
      setSelectedMemberToAdd([]);
      loadAll();
    } else {
      const err = await res.json();
      alert(err.error ?? "Failed to add member");
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member?")) return;
    await fetch(`/api/groups/${id}/members?userId=${memberId}`, { method: "DELETE" });
    loadAll();
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

  const totalAmount = Number(expForm.amount) || 0;
  const splitType = expForm.splitType;

  let validationResult = {
    isValid: true,
    message: "",
    colorClass: "text-[#30d158]",
  };

  if (totalAmount <= 0) {
    validationResult = {
      isValid: false,
      message: "Please enter an amount greater than 0",
      colorClass: "text-muted",
    };
  } else if (splitType === "CUSTOM") {
    const sum = memberList.reduce((acc, m) => {
      const uid = m.userId ?? m.user?.id ?? "";
      return acc + (Number(expForm.splits[uid]) || 0);
    }, 0);
    const roundedSum = Math.round(sum * 100) / 100;
    const roundedTotal = Math.round(totalAmount * 100) / 100;

    if (roundedSum !== roundedTotal) {
      validationResult = {
        isValid: false,
        message: "✕ Split totals mismatch the main expense allocation",
        colorClass: "text-[#ff453a]",
      };
    } else {
      validationResult = {
        isValid: true,
        message: "✓ Values match total perfectly",
        colorClass: "text-[#30d158]",
      };
    }
  } else if (splitType === "PERCENTAGE") {
    const sum = memberList.reduce((acc, m) => {
      const uid = m.userId ?? m.user?.id ?? "";
      return acc + (Number(expForm.splits[uid]) || 0);
    }, 0);
    const roundedSum = Math.round(sum * 100) / 100;

    if (roundedSum !== 100) {
      validationResult = {
        isValid: false,
        message: "✕ Split totals mismatch the main expense allocation",
        colorClass: "text-[#ff453a]",
      };
    } else {
      validationResult = {
        isValid: true,
        message: "✓ Values match total perfectly",
        colorClass: "text-[#30d158]",
      };
    }
  } else if (splitType === "EQUAL") {
    validationResult = {
      isValid: totalAmount > 0,
      message: totalAmount > 0 ? "✓ Values match total perfectly" : "Please enter an amount greater than 0",
      colorClass: totalAmount > 0 ? "text-[#30d158]" : "text-muted",
    };
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">Pocket Detail Panel</span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">{group?.name ?? "Pocket Details"}</h1>
          <p className="text-xs text-muted mt-1 font-normal">{group?.description ?? "Manage shared expenses and settlements"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setReportPeriodType("all-time");
              setReportError(null);
              setShowReportModal(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Report
          </Button>
          {isAdmin && (
            <Button variant="danger" size="sm" onClick={deleteGroup}>
              Delete Pocket
            </Button>
          )}
        </div>
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
          <Card>
            <CardHeader title="Add Expense" />
            <CardBody>
              <form onSubmit={addExpense} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input label="Amount" type="number" step="0.01" required value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
                <Input label="Description" required value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
                <Input label="Date" type="date" required value={expForm.date} onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} />
                <Select label="Split Type" value={expForm.splitType} onChange={(e) => setExpForm({ ...expForm, splitType: e.target.value, splits: {} })} options={SPLIT_TYPES.map(s => ({ value: s, label: s }))} />
                <Select
                  label="Paid By"
                  value={expForm.paidById}
                  onChange={(e) => setExpForm({ ...expForm, paidById: e.target.value })}
                  options={memberList.map((m) => ({ value: m.userId ?? m.user?.id ?? "", label: m.name ?? m.user?.name ?? "" }))}
                />
                {expForm.splitType !== "EQUAL" && (
                  <div className="sm:col-span-2 lg:col-span-3 grid gap-3 sm:grid-cols-2 pt-2 border-t border-[#E8E8ED]/60 dark:border-[#2C2C2E]/40">
                    <p className="sm:col-span-2 text-[10px] font-semibold text-muted uppercase tracking-widest">
                      {expForm.splitType === "PERCENTAGE" ? "Percentage Allocation (must sum to 100)" : "Exact Share Allocation"}
                    </p>
                    {memberList.map((m) => {
                      const uid = m.userId ?? m.user?.id ?? "";
                      return (
                        <Input
                          key={uid}
                          label={m.name ?? m.user?.name ?? uid}
                          type="number"
                          step="0.01"
                          value={expForm.splits[uid] ?? ""}
                          onChange={(e) => setExpForm({ ...expForm, splits: { ...expForm.splits, [uid]: e.target.value } })}
                        />
                      );
                    })}
                  </div>
                )}
                {expForm.amount && (
                  <div className="sm:col-span-2 lg:col-span-3 text-xs font-semibold animate-fade-in pt-1">
                    <span className={`${validationResult.colorClass} flex items-center gap-1.5`}>
                      {validationResult.message}
                    </span>
                  </div>
                )}
                <div className="sm:col-span-2 lg:col-span-3 pt-2">
                  <Button type="submit" disabled={!validationResult.isValid} className="disabled:opacity-40 disabled:select-none">
                    Add Expense
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {expenses.length === 0 ? (
            <p className="text-center py-12 text-muted text-xs">No expenses yet.</p>
          ) : (
            <div className="space-y-4">
              {expenses.map((exp) => (
                <Card key={exp.id} padding="sm" className="hover-lift hover:border-accent/40 dark:hover:border-accent/40 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{exp.description}</p>
                        <span className="inline-block rounded-full bg-accent/10 text-accent text-[9px] font-semibold px-2 py-0.5 border border-accent/20 select-none">
                          {exp.splitType}
                        </span>
                      </div>
                      <p className="text-xl font-bold text-[#1D1D1F] dark:text-white">{formatCurrency(exp.amount, currency)}</p>
                      <p className="text-[10px] text-muted">
                        Paid by <span className="font-semibold text-foreground">{exp.paidBy.name}</span> · {format(new Date(exp.date), "MMM d, yyyy")}
                      </p>
                      <div className="mt-3 grid gap-1.5 pl-3 border-l border-[#E8E8ED] dark:border-[#2C2C2E]">
                        {exp.splits.map((s, i) => (
                          <p key={i} className="text-xs text-muted flex items-center justify-between max-w-xs gap-6">
                            <span>{s.user.name}</span>
                            <span className="font-medium text-foreground">{formatCurrency(s.amount, currency)}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => deleteExpense(exp.id)}>Delete</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
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
                    <p key={i} className="text-sm text-foreground">
                      <span className="font-semibold text-expense">{d.fromName}</span> owes{" "}
                      <span className="font-semibold text-income">{d.toName}</span>{" "}
                      <span className="font-bold text-[#1D1D1F] dark:text-white ml-1">{formatCurrency(d.amount, currency)}</span>
                    </p>
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
              <form onSubmit={recordSettlement} className="grid gap-4 sm:grid-cols-3">
                <Input label="Amount" type="number" step="0.01" required value={settleForm.amount} onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })} />
                <Select
                  label="Pay To"
                  value={settleForm.toId}
                  onChange={(e) => setSettleForm({ ...settleForm, toId: e.target.value })}
                  options={memberList.filter(m => (m.userId ?? m.user?.id) !== userId).map(m => ({ value: m.userId ?? m.user?.id ?? "", label: m.name ?? m.user?.name ?? "" }))}
                />
                <div className="flex items-end"><Button type="submit">Record</Button></div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Add Member" />
            <CardBody>
              <form onSubmit={addMember} className="space-y-4">
                <div className="space-y-1.5">
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
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={selectedMemberToAdd.length === 0}>
                    Add Member
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pocket Members" />
            <CardBody>
              <div className="space-y-3.5 divide-y divide-[#E8E8ED]/60 dark:divide-[#2C2C2E]/40">
                {memberList.map((m) => {
                  const uid = m.userId ?? m.user?.id ?? "";
                  const photo = m.user?.profilePhoto;
                  const initialsName = m.name ?? m.user?.name ?? "";
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
                        <Button size="sm" variant="danger" onClick={() => removeMember(uid)}>Remove</Button>
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
