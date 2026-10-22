"use client";

import { useId, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CURRENCY_SYMBOLS, formatCurrency } from "@/lib/constants";

export type SplitMethod = "EQUAL" | "CUSTOM" | "PERCENTAGE";

export interface FormMember {
  id: string;
  name: string;
}

export interface ExpensePayload {
  amount: number;
  description: string;
  date: string;
  splitType: SplitMethod;
  paidById: string;
  participantIds?: string[];
  splits?: { userId: string; amount: number; percentage?: number }[];
}

/** An existing expense, for editing. */
export interface ExpenseFormInitial {
  amount: number;
  description: string;
  date: string;
  splitType: string;
  paidBy: { id: string; name: string };
  splits: { amount: number; user: { id: string; name: string } }[];
}

interface ExpenseFormProps {
  members: FormMember[];
  currentUserId?: string;
  currency: string;
  initial?: ExpenseFormInitial;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  /** Resolves true when saved; the form clears itself only when `resetOnSuccess` is set. */
  onSubmit: (payload: ExpensePayload) => Promise<boolean>;
  onCancel?: () => void;
  resetOnSuccess?: boolean;
  /** Focus the amount field on mount (for forms that appear after loading). */
  autoFocus?: boolean;
}

// Short visible labels fit three across on a phone; the accessible names stay descriptive
const METHODS: { value: SplitMethod; label: string; name: string }[] = [
  { value: "EQUAL", label: "Equal", name: "Split equally" },
  { value: "CUSTOM", label: "Exact", name: "Exact amounts" },
  { value: "PERCENTAGE", label: "Percent", name: "Percentages" },
];

const toCents = (v: string | number | undefined) => Math.round(Number(v || 0) * 100);
// Percentages are tracked in basis points (1% = 100) to avoid float drift
const toBasisPoints = (v: string | undefined) => Math.round(Number(v || 0) * 100);

/**
 * Splits `total` (cents or basis points) evenly. Leftover units go to the payer when they share
 * the expense, otherwise to the first person. This matches the server's rule.
 */
function evenShares(total: number, ids: string[], paidById: string): Map<string, number> {
  const shares = new Map<string, number>();
  if (ids.length === 0) return shares;
  const base = Math.floor(total / ids.length);
  const remainderTo = ids.includes(paidById) ? paidById : ids[0];
  for (const id of ids) shares.set(id, base + (id === remainderTo ? total - base * ids.length : 0));
  return shares;
}

function initialValues(initial: ExpenseFormInitial | undefined): Record<string, string> {
  if (!initial) return {};
  const involved = initial.splits.filter((s) => s.amount > 0);
  if (initial.splitType === "CUSTOM") {
    return Object.fromEntries(involved.map((s) => [s.user.id, s.amount.toFixed(2)]));
  }
  if (initial.splitType === "PERCENTAGE" && initial.amount > 0) {
    // Percentages are not stored, so derive them from the amounts and make them total exactly 100%
    const bps = involved.map((s) => ({ id: s.user.id, bp: Math.round((s.amount / initial.amount) * 10000) }));
    const drift = 10000 - bps.reduce((sum, b) => sum + b.bp, 0);
    if (bps.length) bps.reduce((max, b) => (b.bp > max.bp ? b : max)).bp += drift;
    return Object.fromEntries(bps.map((b) => [b.id, (b.bp / 100).toFixed(2)]));
  }
  return {};
}

export function ExpenseForm({
  members: activeMembers,
  currentUserId,
  currency,
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
  resetOnSuccess = false,
  autoFocus = false,
}: ExpenseFormProps) {
  const uid = useId();
  const reasonId = `${uid}-reason`;
  const fmt = (cents: number) => formatCurrency(cents / 100, currency);

  // People on the original expense who have since left still need a row, so the form stays honest
  const members: FormMember[] = [...activeMembers];
  if (initial) {
    for (const p of [initial.paidBy, ...initial.splits.map((s) => s.user)]) {
      if (!members.some((m) => m.id === p.id)) members.push({ id: p.id, name: `${p.name} (left group)` });
    }
  }

  const [amount, setAmount] = useState(initial ? initial.amount.toFixed(2) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(
    format(initial ? new Date(initial.date) : new Date(), "yyyy-MM-dd"),
  );
  const [paidById, setPaidById] = useState(initial?.paidBy.id ?? "");
  const [method, setMethod] = useState<SplitMethod>(
    initial && METHODS.some((m) => m.value === initial.splitType) ? (initial.splitType as SplitMethod) : "EQUAL",
  );
  // null means "everyone", so members that load later are included by default
  const [included, setIncluded] = useState<string[] | null>(
    initial ? initial.splits.filter((s) => s.amount > 0).map((s) => s.user.id) : null,
  );
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(initial));

  const payer = paidById || (currentUserId && members.some((m) => m.id === currentUserId) ? currentUserId : "");
  const includedIds = (included ?? activeMembers.map((m) => m.id)).filter((id) => members.some((m) => m.id === id));
  const people = members.filter((m) => includedIds.includes(m.id));
  const totalCents = toCents(amount);

  // ---- live allocation summary
  const equalCents = evenShares(totalCents, people.map((p) => p.id), payer);
  const allocatedCents = people.reduce((sum, p) => sum + toCents(values[p.id]), 0);
  const remainingCents = totalCents - allocatedCents;
  const allocatedBp = people.reduce((sum, p) => sum + toBasisPoints(values[p.id]), 0);
  const remainingBp = 10000 - allocatedBp;
  const emptyPeople = people.filter((p) => !values[p.id]);

  let summary = "";
  if (method === "EQUAL" && people.length) {
    summary = `${fmt(Math.floor(totalCents / people.length))} each · ${people.length} ${people.length === 1 ? "person" : "people"}`;
  } else if (method === "CUSTOM") {
    summary = `Allocated ${fmt(allocatedCents)} of ${fmt(totalCents)} · ${
      remainingCents >= 0 ? `Remaining ${fmt(remainingCents)}` : `Over by ${fmt(-remainingCents)}`
    }`;
  } else if (method === "PERCENTAGE") {
    summary = `Allocated ${(allocatedBp / 100).toFixed(2)}% of 100% · ${
      remainingBp >= 0 ? `Remaining ${(remainingBp / 100).toFixed(2)}%` : `Over by ${(-remainingBp / 100).toFixed(2)}%`
    }`;
  }

  // ---- why the submit button is disabled, stated plainly
  let blockReason: string | null = null;
  if (totalCents <= 0) blockReason = "Enter an amount greater than 0.";
  else if (!description.trim()) blockReason = "Add a description.";
  else if (!payer) blockReason = "Choose who paid.";
  else if (people.length === 0) blockReason = "Choose at least one person to split with.";
  else if (method === "CUSTOM" && remainingCents > 0) blockReason = `Allocate ${fmt(remainingCents)} more.`;
  else if (method === "CUSTOM" && remainingCents < 0) blockReason = `Shares are ${fmt(-remainingCents)} over the total.`;
  else if (method === "PERCENTAGE" && remainingBp !== 0)
    blockReason = `Percentages must add up to 100% (now ${(allocatedBp / 100).toFixed(2)}%).`;

  function toggle(id: string, on: boolean) {
    setIncluded(on ? [...includedIds, id] : includedIds.filter((x) => x !== id));
  }

  function splitEvenly() {
    const ids = people.map((p) => p.id);
    const shares = evenShares(method === "PERCENTAGE" ? 10000 : totalCents, ids, payer);
    setValues(Object.fromEntries(ids.map((id) => [id, ((shares.get(id) ?? 0) / 100).toFixed(2)])));
  }

  function fillRemaining() {
    const last = emptyPeople[0];
    if (!last) return;
    const value = method === "PERCENTAGE" ? remainingBp / 100 : remainingCents / 100;
    setValues({ ...values, [last.id]: value.toFixed(2) });
  }

  function buildPayload(): ExpensePayload {
    const base = { amount: totalCents / 100, description: description.trim(), date, paidById: payer, splitType: method };
    if (method === "EQUAL") return { ...base, participantIds: people.map((p) => p.id) };
    if (method === "CUSTOM") {
      return { ...base, splits: people.map((p) => ({ userId: p.id, amount: toCents(values[p.id]) / 100 })) };
    }
    // Percentages: convert to cents; rounding leftovers go to the payer if involved, else the first person
    const cents = people.map((p) => ({ id: p.id, bp: toBasisPoints(values[p.id]), cents: 0 }));
    for (const c of cents) c.cents = Math.round((c.bp / 10000) * totalCents);
    const drift = totalCents - cents.reduce((sum, c) => sum + c.cents, 0);
    if (drift && cents.length) (cents.find((c) => c.id === payer) ?? cents[0]).cents += drift;
    return {
      ...base,
      splits: cents.map((c) => ({ userId: c.id, amount: c.cents / 100, percentage: c.bp / 100 })),
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (blockReason || pending) return;
    const saved = await onSubmit(buildPayload());
    if (saved && resetOnSuccess) {
      setAmount("");
      setDescription("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setMethod("EQUAL");
      setIncluded(null);
      setValues({});
    }
  }

  const memberOptions = members.map((m) => ({ value: m.id, label: m.name }));

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id={`${uid}-amount`}
          label="Amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          enterKeyHint="next"
          autoFocus={autoFocus}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          id={`${uid}-description`}
          label="Description"
          autoComplete="off"
          enterKeyHint="next"
          maxLength={200}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input id={`${uid}-date`} label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select
          id={`${uid}-paid-by`}
          label="Paid By"
          placeholder="Select who paid"
          value={payer}
          onChange={(e) => setPaidById(e.target.value)}
          options={memberOptions}
        />
      </div>

      <fieldset className="space-y-3 border-t border-[var(--border)] pt-4">
        <legend className="sr-only">How to split</legend>
        <div role="radiogroup" aria-label="Split method" className="flex flex-wrap gap-1 rounded-xl bg-[var(--surface)] p-1">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={method === m.value}
              aria-label={m.name}
              onClick={() => setMethod(m.value)}
              className={`min-h-[40px] flex-1 rounded-lg px-3 text-sm font-medium transition-colors ${
                method === m.value
                  ? "bg-[var(--surface-solid)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <button type="button" className="min-h-[44px] font-semibold text-[var(--accent)] sm:min-h-[32px]" onClick={() => setIncluded(activeMembers.map((m) => m.id))}>
            Select all
          </button>
          <button type="button" className="min-h-[44px] font-semibold text-[var(--accent)] sm:min-h-[32px]" onClick={() => setIncluded([])}>
            Select none
          </button>
          {method !== "EQUAL" && (
            <>
              <button type="button" className="min-h-[44px] font-semibold text-[var(--accent)] sm:min-h-[32px]" onClick={splitEvenly}>
                Split evenly
              </button>
              <button type="button" className="min-h-[44px] font-semibold text-[var(--accent)] sm:min-h-[32px]" onClick={() => setValues({})}>
                Reset
              </button>
            </>
          )}
        </div>

        <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
          {members.map((m) => {
            const isIn = includedIds.includes(m.id);
            const inputId = `${uid}-share-${m.id}`;
            return (
              <li key={m.id} className="flex min-h-[52px] items-center justify-between gap-3 px-3 py-2">
                <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-3 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={isIn}
                    onChange={(e) => toggle(m.id, e.target.checked)}
                    className="h-5 w-5 accent-[var(--accent)]"
                  />
                  {m.name}
                </label>
                {!isIn ? (
                  <span className="text-xs text-[var(--foreground-subtle)]">Not involved</span>
                ) : method === "EQUAL" ? (
                  <span className="text-sm font-medium tabular-nums text-[var(--foreground)]">{fmt(equalCents.get(m.id) ?? 0)}</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {method === "CUSTOM" && <span className="text-xs text-[var(--foreground-muted)]" aria-hidden="true">{CURRENCY_SYMBOLS[currency] ?? currency}</span>}
                    <input
                      id={inputId}
                      aria-label={`${m.name}'s ${method === "PERCENTAGE" ? "percentage" : "share"}`}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={values[m.id] ?? ""}
                      onChange={(e) => setValues({ ...values, [m.id]: e.target.value })}
                      className="w-28 min-h-[40px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-right text-base tabular-nums text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] sm:text-sm"
                    />
                    {method === "PERCENTAGE" && <span className="text-xs text-[var(--foreground-muted)]" aria-hidden="true">%</span>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div aria-live="polite" className="space-y-1.5">
          {summary && totalCents > 0 && (
            <p className="text-xs font-medium tabular-nums text-[var(--foreground-muted)]">{summary}</p>
          )}
          {method !== "EQUAL" && emptyPeople.length === 1 && (method === "PERCENTAGE" ? remainingBp > 0 : remainingCents > 0) && (
            <button type="button" onClick={fillRemaining} className="min-h-[32px] text-xs font-semibold text-[var(--accent)]">
              Give the remaining{" "}
              {method === "PERCENTAGE" ? `${(remainingBp / 100).toFixed(2)}%` : fmt(remainingCents)} to {emptyPeople[0].name}
            </button>
          )}
        </div>
      </fieldset>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" loading={pending} disabled={!!blockReason} aria-describedby={reasonId}>
            {submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
          )}
        </div>
        <p id={reasonId} className="text-xs text-[var(--foreground-muted)]">
          {blockReason ?? ""}
        </p>
        {error && (
          <p role="alert" className="text-xs font-medium text-[var(--expense)]">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
