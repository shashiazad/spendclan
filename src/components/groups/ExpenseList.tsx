"use client";

import { useId, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/constants";

export interface ListExpense {
  id: string;
  amount: number;
  description: string;
  date: string;
  splitType: string;
  canEdit?: boolean;
  paidBy: { id: string; name: string };
  splits: { amount: number; user: { id: string; name: string } }[];
}

interface ExpenseListProps {
  expenses: ListExpense[];
  currency: string;
  currentUserId?: string;
  /** Key of the mutation in flight, used to show a spinner on the matching row. */
  pending: string | null;
  onEdit: (expense: ListExpense) => void;
  onDelete: (expense: ListExpense) => void;
  /** Shown in the empty state, e.g. an "Add the first expense" button. */
  emptyAction?: ReactNode;
}

const SPLIT_LABELS: Record<string, string> = {
  EQUAL: "Split equally",
  CUSTOM: "Exact amounts",
  PERCENTAGE: "By percentage",
};

type Effect = { tone: "lent" | "borrowed" | "none"; text: string };

/** What an expense means for the viewer: money they lent, money they borrowed, or nothing. */
function effectFor(expense: ListExpense, me: string | undefined, fmt: (n: number) => string): Effect {
  if (!me) return { tone: "none", text: "" };
  const myShare = expense.splits.find((s) => s.user.id === me)?.amount ?? 0;
  if (expense.paidBy.id === me) {
    const lent = expense.amount - myShare;
    return lent > 0.004 ? { tone: "lent", text: `you lent ${fmt(lent)}` } : { tone: "none", text: "just for you" };
  }
  return myShare > 0 ? { tone: "borrowed", text: `you borrowed ${fmt(myShare)}` } : { tone: "none", text: "not involved" };
}

const EFFECT_STYLES: Record<Effect["tone"], string> = {
  lent: "text-[var(--income)]",
  borrowed: "text-[var(--expense)]",
  none: "text-[var(--foreground-subtle)]",
};

/** Group expenses grouped by month (newest first), with search and a per-row personal summary. */
export function ExpenseList({ expenses, currency, currentUserId, pending, onEdit, onDelete, emptyAction }: ExpenseListProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const fmt = (n: number) => formatCurrency(n, currency);

  const q = query.trim().toLowerCase();
  const visible = q
    ? expenses.filter((e) => e.description.toLowerCase().includes(q) || e.paidBy.name.toLowerCase().includes(q))
    : expenses;

  // Group by calendar month in the viewer's timezone, newest month first
  const months: { key: string; label: string; items: ListExpense[] }[] = [];
  for (const e of [...visible].sort((a, b) => +new Date(b.date) - +new Date(a.date))) {
    const d = new Date(e.date);
    const key = format(d, "yyyy-MM");
    let month = months.find((m) => m.key === key);
    if (!month) {
      month = { key, label: format(d, "MMMM yyyy"), items: [] };
      months.push(month);
    }
    month.items.push(e);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
          </svg>
        }
        title="No expenses yet"
        description="Add the first expense and choose exactly who it is split with."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">Search expenses</label>
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by description or who paid"
          autoComplete="off"
          enterKeyHint="search"
          className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-base text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] sm:text-sm"
        />
      </div>

      {months.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--foreground-muted)]">No expenses match &ldquo;{query.trim()}&rdquo;.</p>
      )}

      {months.map((month) => {
        const total = month.items.reduce((sum, e) => sum + e.amount, 0);
        const myShare = currentUserId
          ? month.items.reduce((sum, e) => sum + (e.splits.find((s) => s.user.id === currentUserId)?.amount ?? 0), 0)
          : 0;
        const headingId = `month-${month.key}`;
        return (
          <section key={month.key} aria-labelledby={headingId} className="space-y-2">
            <div className="sticky top-14 z-10 -mx-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 rounded-lg bg-[var(--background)]/90 px-1 py-2 backdrop-blur-sm lg:top-0">
              <h3 id={headingId} className="text-sm font-semibold text-[var(--foreground)]">
                {month.label}
              </h3>
              <p className="text-xs tabular-nums text-[var(--foreground-muted)]">
                {fmt(total)} spent · {month.items.length} {month.items.length === 1 ? "expense" : "expenses"}
                {myShare > 0 && <> · your share {fmt(myShare)}</>}
              </p>
            </div>

            <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              {month.items.map((exp) => {
                const d = new Date(exp.date);
                const involved = exp.splits.filter((s) => s.amount > 0);
                const effect = effectFor(exp, currentUserId, fmt);
                const isOpen = expanded.has(exp.id);
                const detailsId = `split-${exp.id}`;
                return (
                  <li key={exp.id} className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {/* Date tile */}
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] leading-none" aria-hidden="true">
                        <span className="text-[11px] font-semibold uppercase text-[var(--foreground-muted)]">{format(d, "MMM")}</span>
                        <span className="mt-0.5 text-base font-bold tabular-nums text-[var(--foreground)]">{format(d, "d")}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{exp.description}</p>
                        <p className="truncate text-xs text-[var(--foreground-muted)]">
                          <span className="sr-only">{format(d, "MMMM d, yyyy")} · </span>
                          {exp.paidBy.id === currentUserId ? "You" : exp.paidBy.name} paid
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-[var(--foreground)]">{fmt(exp.amount)}</p>
                        {effect.text && <p className={`text-xs tabular-nums ${EFFECT_STYLES[effect.tone]}`}>{effect.text}</p>}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-14">
                      <button
                        type="button"
                        onClick={() => toggle(exp.id)}
                        aria-expanded={isOpen}
                        aria-controls={detailsId}
                        className="min-h-[36px] rounded-lg px-2 -ml-2 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-dim)]"
                      >
                        {SPLIT_LABELS[exp.splitType] ?? exp.splitType} · {involved.length} {involved.length === 1 ? "person" : "people"}
                        <svg className={`ml-1 inline h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {exp.canEdit && (
                        <div className="ml-auto flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onEdit(exp)}
                            disabled={pending !== null}
                            aria-label={`Edit ${exp.description}`}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => onDelete(exp)}
                            loading={pending === `delete-expense:${exp.id}`}
                            disabled={pending !== null}
                            aria-label={`Delete ${exp.description}`}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>

                    {isOpen && (
                      <ul id={detailsId} className="mt-2 ml-14 space-y-1.5 rounded-xl border border-[var(--border)] bg-[var(--sidebar-hover)] p-3">
                        {involved.map((s) => (
                          <li key={s.user.id} className="flex items-center justify-between gap-4 text-xs">
                            <span className="text-[var(--foreground-muted)]">
                              {s.user.id === currentUserId ? "You" : s.user.name}
                              {s.user.id === exp.paidBy.id && <span className="text-[var(--foreground-subtle)]"> (paid)</span>}
                            </span>
                            <span className="font-medium tabular-nums text-[var(--foreground)]">{fmt(s.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
