"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  EXPENSE_CATEGORIES,
  FREQUENCIES,
  PAYMENT_METHODS,
  formatCurrency,
} from "@/lib/constants";
import { format, isBefore, startOfDay } from "date-fns";

type Recurring = {
  id: string;
  amount: number;
  category: string;
  frequency: string;
  nextDueDate: string;
  paymentMethod: string;
  notes?: string;
  isActive: boolean;
};

export default function RecurringPage() {
  const { data: session } = useSession();
  const currency = session?.user?.currency ?? "INR";
  const today = startOfDay(new Date());

  const [items, setItems] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    category: EXPENSE_CATEGORIES[0] as string,
    frequency: "MONTHLY",
    nextDueDate: format(new Date(), "yyyy-MM-dd"),
    paymentMethod: "UPI",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/personal/recurring");
    const data = await res.json();
    setItems(data.recurring ?? data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = items.filter((i) => i.isActive);
  const inactive = items.filter((i) => !i.isActive);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/personal/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setShowForm(false);
    setForm({ amount: "", category: EXPENSE_CATEGORIES[0] as string, frequency: "MONTHLY", nextDueDate: format(new Date(), "yyyy-MM-dd"), paymentMethod: "UPI", notes: "" });
    load();
  }

  async function toggleActive(item: Recurring) {
    await fetch("/api/personal/recurring", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this recurring expense?")) return;
    await fetch(`/api/personal/recurring?id=${id}`, { method: "DELETE" });
    load();
  }

  function RecurringCard({ item }: { item: Recurring }) {
    const overdue = item.isActive && isBefore(new Date(item.nextDueDate), today);
    return (
      <Card padding="sm" className={overdue ? "border-red-500/50" : ""}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-200">{item.category}</p>
              {overdue && <Badge variant="danger">Overdue</Badge>}
            </div>
            <p className="mt-1 text-lg font-bold text-emerald-400">{formatCurrency(item.amount, currency)}</p>
            <p className="mt-1 text-sm text-slate-500">
              {item.frequency} · Due {format(new Date(item.nextDueDate), "MMM d, yyyy")}
            </p>
            {item.notes && <p className="mt-1 text-sm text-slate-500">{item.notes}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <Button size="sm" variant="ghost" onClick={() => toggleActive(item)}>
              {item.isActive ? "Deactivate" : "Activate"}
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}>Delete</Button>
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recurring Expenses</h1>
          <p className="mt-1 text-slate-400">Track regular bills and subscriptions</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add Recurring"}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader title="New Recurring Expense" />
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))} />
              <Select label="Frequency" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} options={FREQUENCIES.map(f => ({ value: f, label: f }))} />
              <Input label="Next Due Date" type="date" required value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
              <Select label="Payment Method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} options={PAYMENT_METHODS.map(p => ({ value: p, label: p }))} />
              <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="sm:col-span-2 lg:col-span-3">
                <Button type="submit">Add Recurring Expense</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-200">Active ({active.length})</h2>
        {active.length === 0 ? (
          <p className="text-slate-500">No active recurring expenses.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((item) => <RecurringCard key={item.id} item={item} />)}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-200">Inactive ({inactive.length})</h2>
        {inactive.length === 0 ? (
          <p className="text-slate-500">No inactive recurring expenses.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inactive.map((item) => <RecurringCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  );
}
