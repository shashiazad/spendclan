"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { INCOME_SOURCES, formatCurrency } from "@/lib/constants";
import { format } from "date-fns";

type Income = {
  id: string;
  amount: number;
  source: string;
  date: string;
  notes?: string;
};

const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("default", { month: "long" }),
}));

const years = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i;
  return { value: String(y), label: String(y) };
});

export default function IncomePage() {
  const { data: session } = useSession();
  const currency = session?.user?.currency ?? "INR";
  const now = new Date();

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount: "",
    source: INCOME_SOURCES[0] as string,
    date: format(now, "yyyy-MM-dd"),
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/personal/income?month=${month}&year=${year}`);
    const data = await res.json();
    setIncomes(data.incomes ?? data);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const total = incomes.reduce((s, i) => s + i.amount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form, amount: Number(form.amount) };
    const method = editId ? "PUT" : "POST";
    const payload = editId ? { ...body, id: editId } : body;
    await fetch("/api/personal/income", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setEditId(null);
    setForm({ amount: "", source: INCOME_SOURCES[0] as string, date: format(now, "yyyy-MM-dd"), notes: "" });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this income entry?")) return;
    await fetch(`/api/personal/income?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Income</h1>
        <p className="mt-1 text-slate-400">Track your earnings</p>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Only record real earnings — salary, freelance, business income, etc.
      </div>

      <Card>
        <CardHeader title="Filters" />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)} options={months} />
            <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)} options={years} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={editId ? "Edit Income" : "Add Income"} />
        <CardBody>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Input label="Amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Select label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} options={INCOME_SOURCES.map(s => ({ value: s, label: s }))} />
            <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">{editId ? "Update" : "Add"} Income</Button>
              {editId && <Button type="button" variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card padding="none">
        <div className="border-b border-slate-800 px-6 py-4">
          <p className="text-sm text-slate-400">
            Total: <span className="font-bold text-teal-400">{formatCurrency(total, currency)}</span>
          </p>
        </div>
        {loading ? (
          <div className="flex h-32 items-center justify-center"><LoadingSpinner /></div>
        ) : incomes.length === 0 ? (
          <p className="p-6 text-slate-500">No income entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Notes</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((inc) => (
                  <tr key={inc.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-6 py-3">{format(new Date(inc.date), "MMM d, yyyy")}</td>
                    <td className="px-6 py-3">{inc.source}</td>
                    <td className="px-6 py-3 text-slate-500">{inc.notes ?? "—"}</td>
                    <td className="px-6 py-3 text-right text-teal-400">{formatCurrency(inc.amount, currency)}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setEditId(inc.id); setForm({ amount: String(inc.amount), source: inc.source, date: format(new Date(inc.date), "yyyy-MM-dd"), notes: inc.notes ?? "" }); }}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(inc.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
