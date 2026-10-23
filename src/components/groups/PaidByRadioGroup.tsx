"use client";

import { useId } from "react";

export interface PayerOption {
  id: string;
  name: string;
  /** Left the group: shown (checked) only when editing an expense they paid, and not selectable. */
  removed?: boolean;
}

interface PaidByRadioGroupProps {
  members: PayerOption[];
  value: string;
  onChange: (id: string) => void;
  currentUserId?: string;
  /** Visible label; the group is announced with it. */
  label?: string;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * "Paid by" as radio cards. Native radios keep arrow-key, Space and screen-reader behaviour;
 * the cards are only styling. Exactly one payer is selected.
 */
export function PaidByRadioGroup({ members, value, onChange, currentUserId, label = "Paid by" }: PaidByRadioGroupProps) {
  const name = useId();
  // Current user first, then everyone else in their given order
  const ordered = [
    ...members.filter((m) => m.id === currentUserId),
    ...members.filter((m) => m.id !== currentUserId),
  ];
  const layout = ordered.length >= 4 ? "grid grid-cols-2 sm:grid-cols-3" : "flex flex-wrap";

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium text-[var(--foreground-muted)]">{label}</legend>
      <div className={`${layout} gap-2`}>
        {ordered.map((m) => {
          const isYou = m.id === currentUserId;
          const display = isYou ? "You" : m.name;
          return (
            <label
              key={m.id}
              className={`relative flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors
                border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]
                has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-dim)]
                has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent-ring)]
                ${m.removed ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-[var(--accent)]"}`}
            >
              <input
                type="radio"
                name={name}
                value={m.id}
                checked={value === m.id}
                disabled={m.removed}
                onChange={() => onChange(m.id)}
                aria-label={isYou ? `You (${m.name})` : m.removed ? `${m.name} (removed)` : m.name}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] text-xs font-bold text-[var(--accent)]"
              >
                {initials(m.name)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium" title={m.name}>
                {display}
                {m.removed && <span className="font-normal text-[var(--foreground-subtle)]"> (removed)</span>}
              </span>
              {value === m.id && (
                <svg className="h-4 w-4 shrink-0 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
