"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_TYPES,
  PAYMENT_METHODS,
  CATEGORIES_BY_TYPE,
  TYPE_COLORS,
  formatCurrency,
} from "@/lib/constants";
import { format } from "date-fns";

type Expense = {
  id: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: string;
  notes?: string;
  type: string;
};

const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("default", { month: "long" }),
}));

const years = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i;
  return { value: String(y), label: String(y) };
});

export default function ExpensesPage() {
  const { data: session } = useSession();
  const currency = session?.user?.currency ?? "INR";
  const now = new Date();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount: "",
    category: (CATEGORIES_BY_TYPE["DAILY"]?.[0] ?? EXPENSE_CATEGORIES[0]) as string,
    date: format(now, "yyyy-MM-dd"),
    paymentMethod: "UPI",
    type: "DAILY",
    notes: "",
  });

  const filteredCategories = CATEGORIES_BY_TYPE[form.type] ?? EXPENSE_CATEGORIES;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ month, year });
    if (filterCategory) params.set("category", filterCategory);
    if (filterType) params.set("type", filterType);
    const res = await fetch(`/api/personal/expenses?${params}`);
    const data = await res.json();
    setExpenses(data.expenses ?? data);
    setLoading(false);
  }, [month, year, filterCategory, filterType]);

  useEffect(() => { load(); }, [load]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form, amount: Number(form.amount) };
    const method = editId ? "PUT" : "POST";
    const payload = editId ? { ...body, id: editId } : body;
    await fetch("/api/personal/expenses", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setEditId(null);
    setForm({
      amount: "",
      category: (CATEGORIES_BY_TYPE["DAILY"]?.[0] ?? EXPENSE_CATEGORIES[0]) as string,
      date: format(now, "yyyy-MM-dd"),
      paymentMethod: "UPI",
      type: "DAILY",
      notes: "",
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/personal/expenses?id=${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(exp: Expense) {
    setEditId(exp.id);
    setForm({
      amount: String(exp.amount),
      category: exp.category,
      date: format(new Date(exp.date), "yyyy-MM-dd"),
      paymentMethod: exp.paymentMethod,
      type: exp.type,
      notes: exp.notes ?? "",
    });
  }

  function handleTypeChange(newType: string) {
    const cats = CATEGORIES_BY_TYPE[newType] ?? EXPENSE_CATEGORIES;
    setForm({
      ...form,
      type: newType,
      category: cats[0] as string,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Expenses</h1>
        <p className="mt-1 text-slate-400">Track your personal spending</p>
      </div>

      <Card>
        <CardHeader title="Filters" />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-4">
            <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)} options={months} />
            <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)} options={years} />
            <Select label="Category" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} options={[{ value: "", label: "All" }, ...EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))]} />
            <Select label="Type" value={filterType} onChange={(e) => setFilterType(e.target.value)} options={[{ value: "", label: "All" }, ...EXPENSE_TYPES.map(t => ({ value: t, label: t }))]} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={editId ? "Edit Expense" : "Add Expense"} />
        <CardBody>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              options={EXPENSE_TYPES.map(t => ({ value: t, label: t }))}
            />
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={filteredCategories.map(c => ({ value: c, label: c }))}
            />
            <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Select label="Payment Method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} options={PAYMENT_METHODS.map(p => ({ value: p, label: p }))} />
            <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="submit">{editId ? "Update" : "Add"} Expense</Button>
              {editId && <Button type="button" variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card padding="none">
        <div className="border-b border-slate-800 px-6 py-4">
          <p className="text-sm text-slate-400">
            Total: <span className="font-bold text-red-400">{formatCurrency(total, currency)}</span>
            <span className="ml-4 text-slate-600">({expenses.length} entries)</span>
          </p>
        </div>
        {loading ? (
          <div className="flex h-32 items-center justify-center"><LoadingSpinner /></div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            }
            title="No expenses found"
            description="Add your first expense using the form above or the quick-add button."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const tc = TYPE_COLORS[exp.type] ?? TYPE_COLORS.DAILY;
                  return (
                    <tr key={exp.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3">{format(new Date(exp.date), "MMM d, yyyy")}</td>
                      <td className="px-6 py-3">{exp.category}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tc.bg} ${tc.text}`}>
                          {tc.label}
                        </span>
                      </td>
                      <td className="px-6 py-3">{exp.paymentMethod}</td>
                      <td className="px-6 py-3 text-right text-red-400">{formatCurrency(exp.amount, currency)}</td>
                      <td className="px-6 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(exp)}>Edit</Button>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(exp.id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
