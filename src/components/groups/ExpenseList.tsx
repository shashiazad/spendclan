"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
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
  /** Present in search results. */
  group?: { id: string; name: string };
  deletedAt?: string | null;
  edited?: boolean;
}

interface ExpenseListProps {
  expenses: ListExpense[];
  currency: string;
  currentUserId?: string;
  /** Key of the mutation in flight, used to show a spinner on the matching row. */
  pending: string | null;
  /** Without these the rows have no Edit/Delete buttons (e.g. the all-groups list). */
  onEdit?: (expense: ListExpense) => void;
  onDelete?: (expense: ListExpense) => void;
  /** Shown in the empty state, e.g. an "Add the first expense" button. */
  emptyAction?: ReactNode;
  /** Search text to highlight in descriptions. */
  highlight?: string;
  /** Show which group each expense belongs to (all-groups search). */
  showGroup?: boolean;
  /** Month headings are h3 under a section's h2; use 2 on pages without one. */
  headingLevel?: 2 | 3;
}

/** Wraps case-insensitive matches of `term` in <mark>. */
function Highlight({ text, term }: { text: string; term?: string }) {
  const t = term?.trim();
  if (!t) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = t.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  for (let i = lower.indexOf(needle); i !== -1; i = lower.indexOf(needle, from)) {
    if (i > from) parts.push(text.slice(from, i));
    parts.push(
      <mark key={i} className="rounded-sm bg-[var(--accent-dim)] text-[var(--accent)]">
        {text.slice(i, i + t.length)}
      </mark>,
    );
    from = i + t.length;
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
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

/**
 * Expenses grouped by calendar month with a per-row personal summary. Rows keep the order they are
 * given in (newest first by default), so a sorted search result stays sorted.
 */
export function ExpenseList({
  expenses,
  currency,
  currentUserId,
  pending,
  onEdit,
  onDelete,
  emptyAction,
  highlight,
  showGroup = false,
  headingLevel = 3,
}: ExpenseListProps) {
  const MonthHeading = headingLevel === 2 ? "h2" : "h3";
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const fmt = (n: number) => formatCurrency(n, currency);

  // Group by calendar month in the viewer's timezone
  const months: { key: string; label: string; items: ListExpense[] }[] = [];
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = format(d, "yyyy-MM");
    // Consecutive rows of the same month share a section (sorting by amount can revisit a month)
    let month = months[months.length - 1]?.key === key ? months[months.length - 1] : undefined;
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
      {months.map((month, index) => {
        const total = month.items.reduce((sum, e) => sum + e.amount, 0);
        const myShare = currentUserId
          ? month.items.reduce((sum, e) => sum + (e.splits.find((s) => s.user.id === currentUserId)?.amount ?? 0), 0)
          : 0;
        const headingId = `month-${month.key}-${index}`;
        return (
          <section key={headingId} aria-labelledby={headingId} className="space-y-2">
            <div className="sticky top-14 z-10 -mx-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 rounded-lg bg-[var(--background)]/90 px-1 py-2 backdrop-blur-sm lg:top-0">
              <MonthHeading id={headingId} className="text-sm font-semibold text-[var(--foreground)]">
                {month.label}
              </MonthHeading>
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
                        <span className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">{format(d, "MMM")}</span>
                        <span className="mt-0.5 text-base font-bold tabular-nums text-[var(--foreground)]">{format(d, "d")}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-[var(--foreground)]">
                          <span className="truncate" title={exp.description}>
                            <Highlight text={exp.description} term={highlight} />
                          </span>
                          {exp.deletedAt && (
                            <span className="shrink-0 rounded-full bg-[var(--expense-dim)] px-1.5 py-0.5 text-xs font-semibold uppercase text-[var(--expense)]">Deleted</span>
                          )}
                          {exp.edited && !exp.deletedAt && (
                            <span className="shrink-0 rounded-full bg-[var(--sidebar-hover)] px-1.5 py-0.5 text-xs font-semibold uppercase text-[var(--foreground-muted)]">Edited</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-[var(--foreground-muted)]">
                          <span className="sr-only">{format(d, "MMMM d, yyyy")} · </span>
                          {exp.paidBy.id === currentUserId ? "You" : exp.paidBy.name} paid
                          {showGroup && exp.group && (
                            <>
                              {" · "}
                              <Link href={`/groups/${exp.group.id}`} className="font-medium text-[var(--accent)] hover:underline">
                                {exp.group.name}
                              </Link>
                            </>
                          )}
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
                      {exp.canEdit && onEdit && onDelete && (
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
