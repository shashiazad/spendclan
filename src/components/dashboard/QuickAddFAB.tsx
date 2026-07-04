"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_TYPES,
  PAYMENT_METHODS,
  CATEGORIES_BY_TYPE,
} from "@/lib/constants";
import { format } from "date-fns";

export function QuickAddFAB() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    category: EXPENSE_CATEGORIES[0] as string,
    date: format(new Date(), "yyyy-MM-dd"),
    paymentMethod: "UPI",
    type: "DAILY",
    notes: "",
  });

  const filteredCategories = CATEGORIES_BY_TYPE[form.type] ?? EXPENSE_CATEGORIES;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/personal/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      if (res.ok) {
        addToast("Expense added successfully!", "success");
        setOpen(false);
        setForm({
          amount: "",
          category: EXPENSE_CATEGORIES[0] as string,
          date: format(new Date(), "yyyy-MM-dd"),
          paymentMethod: "UPI",
          type: "DAILY",
          notes: "",
        });
      } else {
        addToast("Failed to add expense", "error");
      }
    } catch {
      addToast("Network error", "error");
    }
    setSaving(false);
  }

  if (!session) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[var(--shadow-lg)] transition-all duration-150 hover:bg-[var(--accent-hover)] active:opacity-90 lg:bottom-8 lg:right-8"
        aria-label="Quick add expense"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Quick Add Expense" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              autoFocus
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => {
                const newType = e.target.value;
                const cats = CATEGORIES_BY_TYPE[newType] ?? EXPENSE_CATEGORIES;
                setForm({
                  ...form,
                  type: newType,
                  category: cats[0] as string,
                });
              }}
              options={EXPENSE_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={filteredCategories.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Payment"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              options={PAYMENT_METHODS.map((p) => ({ value: p, label: p }))}
            />
            <Input
              label="Date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <Input
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Add Expense
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
