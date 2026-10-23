"use client";

import { useId, type ReactNode } from "react";
import { DATE_PRESETS, datePresetRange, matchDatePreset, type DatePreset, type Named } from "@/lib/search-tokens";
import type { UrlFilters } from "@/lib/search-url";

interface FilterPanelProps {
  value: UrlFilters;
  onChange: (next: UrlFilters) => void;
  people: Named[];
  /** Only on the all-groups page. */
  groups?: Named[];
  meId?: string;
}

const SPLIT_OPTIONS = [
  { value: "EQUAL", label: "Equal" },
  { value: "CUSTOM", label: "Exact" },
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "RATIO", label: "Ratio" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "edited", label: "Edited" },
  { value: "deleted", label: "Deleted" },
] as const;

const MATCH_OPTIONS = [
  { value: "contains", label: "Contains" },
  { value: "starts", label: "Starts with" },
  { value: "fuzzy", label: "Typo-tolerant" },
] as const;

const fieldClass =
  "w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] sm:text-sm";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{title}</legend>
      {children}
    </fieldset>
  );
}

/** A checkbox or radio styled as a chip. Native inputs keep keyboard and screen-reader behaviour. */
function ChoiceChip({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  type: "checkbox" | "radio";
  name?: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--accent)]
        has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-dim)] has-[:checked]:text-[var(--accent)]
        has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent-ring)]"
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      {checked && (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      {children}
    </label>
  );
}

function PeopleChoice({
  people,
  selected,
  onToggle,
  meId,
}: {
  people: Named[];
  selected: string[];
  onToggle: (id: string) => void;
  meId?: string;
}) {
  if (people.length === 0) return <p className="text-sm text-[var(--foreground-muted)]">No members to choose from.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {people.map((p) => (
        <ChoiceChip key={p.id} type="checkbox" checked={selected.includes(p.id)} onChange={() => onToggle(p.id)}>
          {p.id === meId ? "You" : p.name}
        </ChoiceChip>
      ))}
    </div>
  );
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** Every filter except the free text and sort. Controlled: changes go to `onChange` immediately. */
export function FilterPanel({ value: f, onChange, people, groups, meId }: FilterPanelProps) {
  const uid = useId();
  const set = (patch: Partial<UrlFilters>) => onChange({ ...f, ...patch });
  const preset = matchDatePreset(f.from, f.to);

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {groups && groups.length > 0 && (
        <Section title="Group">
          <PeopleChoice people={groups} selected={f.groupId} onToggle={(id) => set({ groupId: toggle(f.groupId, id) })} />
        </Section>
      )}

      <Section title="Paid by">
        <PeopleChoice people={people} selected={f.paidBy} meId={meId} onToggle={(id) => set({ paidBy: toggle(f.paidBy, id) })} />
      </Section>

      <Section title="Split with">
        <PeopleChoice people={people} selected={f.involving} meId={meId} onToggle={(id) => set({ involving: toggle(f.involving, id) })} />
      </Section>

      <Section title="Date">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DATE_PRESETS) as DatePreset[]).map((p) => (
            <ChoiceChip
              key={p}
              type="radio"
              name={`${uid}-preset`}
              checked={preset === p}
              onChange={() => set(datePresetRange(p))}
            >
              {DATE_PRESETS[p]}
            </ChoiceChip>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs text-[var(--foreground-muted)]">
            From
            <input type="date" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value })} className={fieldClass} />
          </label>
          <label className="space-y-1 text-xs text-[var(--foreground-muted)]">
            To
            <input type="date" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value })} className={fieldClass} />
          </label>
        </div>
        <label className="flex items-center justify-between gap-3 text-xs text-[var(--foreground-muted)]">
          Date means
          <select
            value={f.dateField}
            onChange={(e) => set({ dateField: e.target.value as UrlFilters["dateField"] })}
            className={`${fieldClass} w-auto`}
          >
            <option value="date">Expense date</option>
            <option value="added">Added on</option>
          </select>
        </label>
      </Section>

      <Section title="Amount">
        <div className="grid grid-cols-2 gap-2">
          <label className="col-span-2 space-y-1 text-xs text-[var(--foreground-muted)]">
            Exactly
            <input
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 1,200"
              value={f.amount}
              onChange={(e) => set({ amount: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="col-span-2 flex min-h-[36px] items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="checkbox" checked={f.approx} onChange={(e) => set({ approx: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
            About this amount (±5%)
          </label>
          <label className="space-y-1 text-xs text-[var(--foreground-muted)]">
            Min
            <input inputMode="decimal" autoComplete="off" placeholder="0" value={f.minAmount} onChange={(e) => set({ minAmount: e.target.value })} className={fieldClass} />
          </label>
          <label className="space-y-1 text-xs text-[var(--foreground-muted)]">
            Max
            <input inputMode="decimal" autoComplete="off" placeholder="Any" value={f.maxAmount} onChange={(e) => set({ maxAmount: e.target.value })} className={fieldClass} />
          </label>
        </div>
      </Section>

      <Section title="Description">
        <div className="flex flex-wrap gap-2">
          {MATCH_OPTIONS.map((m) => (
            <ChoiceChip key={m.value} type="radio" name={`${uid}-match`} checked={f.match === m.value} onChange={() => set({ match: m.value })}>
              {m.label}
            </ChoiceChip>
          ))}
        </div>
      </Section>

      <Section title="Split type">
        <div className="flex flex-wrap gap-2">
          {SPLIT_OPTIONS.map((s) => (
            <ChoiceChip key={s.value} type="checkbox" checked={f.splitType.includes(s.value)} onChange={() => set({ splitType: toggle(f.splitType, s.value) })}>
              {s.label}
            </ChoiceChip>
          ))}
        </div>
      </Section>

      <Section title="Added by">
        <PeopleChoice people={people} selected={f.addedBy} meId={meId} onToggle={(id) => set({ addedBy: toggle(f.addedBy, id) })} />
      </Section>

      <Section title="Status">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <ChoiceChip key={s.value} type="radio" name={`${uid}-status`} checked={f.status === s.value} onChange={() => set({ status: s.value })}>
              {s.label}
            </ChoiceChip>
          ))}
        </div>
        {f.status === "deleted" && (
          <p className="text-xs text-[var(--foreground-muted)]">Shows deleted expenses you added, or all of them in groups you manage.</p>
        )}
      </Section>
    </div>
  );
}
