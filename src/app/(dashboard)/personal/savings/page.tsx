"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatCurrency } from "@/lib/constants";
import { format } from "date-fns";

type SavingsCalc = {
  income: number;
  expenses: number;
  calculatedSavings: number;
  manualSaving: number | null;
};

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
};

const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("default", { month: "long" }),
}));

const years = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i;
  return { value: String(y), label: String(y) };
});

export default function SavingsPage() {
  const { data: session } = useSession();
  const currency = session?.user?.currency ?? "INR";
  const now = new Date();

  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [calc, setCalc] = useState<SavingsCalc | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualAmount, setManualAmount] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [goalForm, setGoalForm] = useState({ name: "", targetAmount: "", currentAmount: "0", deadline: "" });
  const [editGoalId, setEditGoalId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [calcRes, goalsRes] = await Promise.all([
      fetch(`/api/personal/savings/calculate?month=${month}&year=${year}`),
      fetch("/api/personal/savings/goals"),
    ]);
    const calcData = await calcRes.json();
    const goalsData = await goalsRes.json();
    setCalc(calcData);
    setGoals(goalsData.goals ?? goalsData);
    setManualAmount(calcData.manualSaving != null ? String(calcData.manualSaving) : "");
    setLoading(false);
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  async function saveManual(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/personal/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(manualAmount),
        month: Number(month),
        year: Number(year),
        notes: manualNotes || null,
      }),
    });
    load();
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: goalForm.name,
      targetAmount: Number(goalForm.targetAmount),
      currentAmount: Number(goalForm.currentAmount),
      deadline: goalForm.deadline || null,
    };
    await fetch("/api/personal/savings/goals", {
      method: editGoalId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editGoalId ? { ...body, id: editGoalId } : body),
    });
    setGoalForm({ name: "", targetAmount: "", currentAmount: "0", deadline: "" });
    setEditGoalId(null);
    load();
  }

  async function updateGoalProgress(id: string, currentAmount: number) {
    await fetch("/api/personal/savings/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, currentAmount }),
    });
    load();
  }

  async function deleteGoal(id: string) {
    if (!confirm("Delete this savings goal?")) return;
    await fetch(`/api/personal/savings/goals?id=${id}`, { method: "DELETE" });
    load();
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Savings</h1>
        <p className="mt-1 text-slate-400">Track monthly savings and goals</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200">Monthly Savings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)} options={months} />
          <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)} options={years} />
        </div>

        {calc && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card padding="sm">
              <p className="text-xs uppercase text-slate-500">Income</p>
              <p className="mt-1 text-xl font-bold text-teal-400">{formatCurrency(calc.income, currency)}</p>
            </Card>
            <Card padding="sm">
              <p className="text-xs uppercase text-slate-500">Expenses</p>
              <p className="mt-1 text-xl font-bold text-red-400">{formatCurrency(calc.expenses, currency)}</p>
            </Card>
            <Card padding="sm">
              <p className="text-xs uppercase text-slate-500">Calculated Savings</p>
              <p className="mt-1 text-xl font-bold text-blue-400">{formatCurrency(calc.calculatedSavings, currency)}</p>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader title="Manual Savings Entry" description="Override or record savings for this month" />
          <CardBody>
            <form onSubmit={saveManual} className="grid gap-4 sm:grid-cols-3">
              <Input label="Amount" type="number" step="0.01" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} />
              <Input label="Notes" value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} />
              <div className="flex items-end">
                <Button type="submit">Save Entry</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200">Savings Goals</h2>

        <Card>
          <CardHeader title={editGoalId ? "Edit Goal" : "New Goal"} />
          <CardBody>
            <form onSubmit={saveGoal} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="Name" required value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} />
              <Input label="Target Amount" type="number" step="0.01" required value={goalForm.targetAmount} onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })} />
              <Input label="Current Amount" type="number" step="0.01" value={goalForm.currentAmount} onChange={(e) => setGoalForm({ ...goalForm, currentAmount: e.target.value })} />
              <Input label="Deadline" type="date" value={goalForm.deadline} onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })} />
              <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
                <Button type="submit">{editGoalId ? "Update" : "Add"} Goal</Button>
                {editGoalId && <Button type="button" variant="secondary" onClick={() => setEditGoalId(null)}>Cancel</Button>}
              </div>
            </form>
          </CardBody>
        </Card>

        {goals.length === 0 ? (
          <p className="text-slate-500">No savings goals yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {goals.map((goal) => {
              const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
              return (
                <Card key={goal.id} padding="sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-200">{goal.name}</p>
                      {goal.deadline && (
                        <p className="text-sm text-slate-500">Due {format(new Date(goal.deadline), "MMM d, yyyy")}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditGoalId(goal.id); setGoalForm({ name: goal.name, targetAmount: String(goal.targetAmount), currentAmount: String(goal.currentAmount), deadline: goal.deadline ? format(new Date(goal.deadline), "yyyy-MM-dd") : "" }); }}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteGoal(goal.id)}>Delete</Button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-teal-400">{formatCurrency(goal.currentAmount, currency)}</span>
                      <span className="text-slate-500">{formatCurrency(goal.targetAmount, currency)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{pct.toFixed(0)}% complete</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Update progress"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = Number((e.target as HTMLInputElement).value);
                          if (!isNaN(val)) updateGoalProgress(goal.id, val);
                        }
                      }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
