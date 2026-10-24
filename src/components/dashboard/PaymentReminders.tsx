"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Reminder = { name: string; amount: number; message: string };

const TONES = [
  { id: "friendly", label: "Friendly" },
  { id: "casual", label: "Casual" },
  { id: "formal", label: "Formal" },
];

export function PaymentReminders() {
  const [tone, setTone] = useState("friendly");
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to draft reminders");
      setReminders(json.reminders);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to draft reminders");
    }
    setLoading(false);
  }

  function copy(r: Reminder) {
    navigator.clipboard?.writeText(r.message).then(() => {
      setCopied(r.name);
      setTimeout(() => setCopied((n) => (n === r.name ? null : n)), 1500);
    }).catch(() => {});
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-6">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Payment reminders</h3>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            Draft a polite message for everyone who owes you, ready to paste into WhatsApp or SMS.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TONES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                tone === t.id
                  ? "border-[var(--accent)]/30 bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-hover)]"
              }`}
            >
              {t.label}
            </button>
          ))}
          <Button onClick={generate} disabled={loading} className="ml-auto rounded-lg">
            {loading ? "Drafting..." : reminders ? "Redraft" : "Draft reminders"}
          </Button>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-[var(--expense)]/20 bg-[var(--expense-dim)] p-4 text-sm text-[var(--expense)]">{error}</div>
      )}

      {reminders && reminders.length === 0 && (
        <Card className="p-6 text-center text-sm text-[var(--foreground-muted)]">Nobody owes you anything right now. 🎉</Card>
      )}

      {reminders?.map((r) => (
        <Card key={r.name} className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--foreground)]">{r.name}</span>
            <button onClick={() => copy(r)} className="text-xs font-medium text-[var(--accent)] hover:underline">
              {copied === r.name ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-[var(--foreground-muted)]">{r.message}</p>
        </Card>
      ))}
    </div>
  );
}
