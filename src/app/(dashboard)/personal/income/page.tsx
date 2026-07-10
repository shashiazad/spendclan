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
  }, [month, year, setLoading, setIncomes]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) load();
    });
    return () => {
      active = false;
    };
  }, [load]);

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
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">Personal Tracking</span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">Income</h1>
        </div>
      </div>

      {/* Info Alert Banner */}
      <div className="rounded-2xl border border-[#E8E8ED] dark:border-[#2C2C2E] bg-white/40 dark:bg-[#1C1C1E]/40 px-4 py-3.5 text-xs text-muted flex items-center gap-2.5">
        <svg className="h-4 w-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Only record real earnings — salary, freelance, business income, etc.</span>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card padding="md" className="hover-lift transition-all duration-300">
          <p className="text-[9px] font-semibold text-muted uppercase tracking-widest">Total Income</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-income leading-none">
            {formatCurrency(total, currency)}
          </p>
        </Card>
        <Card padding="md" className="hover-lift transition-all duration-300">
          <p className="text-[9px] font-semibold text-muted uppercase tracking-widest">Recorded Entries</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] dark:text-white leading-none">
            {incomes.length} <span className="text-xs font-normal text-muted">entries</span>
          </p>
        </Card>
        <Card padding="md" className="hover-lift transition-all duration-300">
          <p className="text-[9px] font-semibold text-muted uppercase tracking-widest">Average Earning</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] dark:text-white leading-none">
            {formatCurrency(incomes.length > 0 ? total / incomes.length : 0, currency)}
          </p>
        </Card>
      </div>

      {/* Filter and Add Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Add/Edit Income Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title={editId ? "Edit Income" : "Add Income"} />
            <CardBody>
              <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                <Input label="Amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <Select label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} options={INCOME_SOURCES.map(s => ({ value: s, label: s }))} />
                <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <div className="flex gap-2 sm:col-span-2 pt-2">
                  <Button type="submit" variant="primary">{editId ? "Update" : "Add"}</Button>
                  {editId && <Button type="button" variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>}
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Right column: Filters */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Filters" />
            <CardBody>
              <div className="space-y-4">
                <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)} options={months} />
                <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)} options={years} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Income Table Card */}
      <Card padding="none">
        <div className="border-b border-[#E8E8ED] dark:border-[#2C2C2E] px-6 py-4 flex items-center justify-between">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest">Earning Logs</p>
          <span className="text-xs text-muted font-mono">{incomes.length} entries</span>
        </div>
        {loading ? (
          <div className="flex h-32 items-center justify-center"><LoadingSpinner /></div>
        ) : incomes.length === 0 ? (
          <p className="p-6 text-center text-muted text-xs">No income entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E8ED] dark:border-[#2C2C2E] text-left text-[9px] font-semibold text-muted uppercase tracking-widest select-none">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Notes</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((inc) => (
                  <tr key={inc.id} className="border-b border-[#E8E8ED]/60 dark:border-[#2C2C2E]/40 hover:bg-[#F5F5F7]/30 dark:hover:bg-[#1C1C1E]/30 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]">
                    <td className="px-6 py-4 text-foreground font-medium">{format(new Date(inc.date), "MMM d, yyyy")}</td>
                    <td className="px-6 py-4 text-foreground">{inc.source}</td>
                    <td className="px-6 py-4 text-muted">{inc.notes ?? "—"}</td>
                    <td className="px-6 py-4 text-right text-income font-bold">{formatCurrency(inc.amount, currency)}</td>
                    <td className="px-6 py-4">
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
