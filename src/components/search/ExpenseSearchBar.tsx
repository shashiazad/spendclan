"use client";

import { useEffect, useId, useRef, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { DropdownMenu, type MenuItem } from "@/components/ui/DropdownMenu";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CURRENCY_SYMBOLS } from "@/lib/constants";
import { DATE_PRESETS, looksLikeTokenStart, matchDatePreset, parseSearch, type Named } from "@/lib/search-tokens";
import { EMPTY_FILTERS, activeFilterCount, mergeTokenFilters, readUrlFilters, writeUrlFilters, type UrlFilters } from "@/lib/search-url";
import { FilterPanel } from "./FilterPanel";
import { useMediaQuery } from "./hooks";

interface ExpenseSearchBarProps {
  filters: UrlFilters;
  onChange: (next: UrlFilters) => void;
  people: Named[];
  /** Only on the all-groups page: enables the Group filter and `group:` token. */
  groups?: Named[];
  meId?: string;
  currency: string;
  /** Namespaces recent and saved searches, e.g. "all" or a group id. */
  storageKey: string;
}

const DEBOUNCE_MS = 300;
const MAX_RECENT = 8;

interface SavedSearch {
  name: string;
  query: string;
}

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); recent/saved searches are a convenience only
  }
}

const SORT_OPTIONS: { value: UrlFilters["sort"]; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "amount_desc", label: "Amount: high to low" },
  { value: "amount_asc", label: "Amount: low to high" },
  { value: "description", label: "Description A→Z" },
  { value: "edited", label: "Recently edited" },
];

const SPLIT_LABELS: Record<string, string> = { EQUAL: "Equal", CUSTOM: "Exact", PERCENTAGE: "Percentage" };

/** Search box (with `paid:`, `>500`, `date:` tokens), filters, sort, saved searches and active-filter chips. */
export function ExpenseSearchBar({ filters, onChange, people, groups, meId, currency, storageKey }: ExpenseSearchBarProps) {
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [text, setText] = useState(filters.q);
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<UrlFilters>(filters);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const recentKey = `spendclan:recent-searches:${storageKey}`;
  const savedKey = `spendclan:saved-searches:${storageKey}`;
  // Only shown inside the closed-by-default menu, so reading storage on the first client render is safe
  const [recent, setRecent] = useState<string[]>(() => (typeof window === "undefined" ? [] : readStore<string[]>(recentKey, [])));
  const [saved, setSaved] = useState<SavedSearch[]>(() => (typeof window === "undefined" ? [] : readStore<SavedSearch[]>(savedKey, [])));
  const filtersRef = useRef(filters);
  const committedText = useRef(filters.q);
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Text changed from outside (a chip removed, Clear all, a saved search): show it
  useEffect(() => {
    if (filters.q !== committedText.current) {
      committedText.current = filters.q;
      setText(filters.q);
    }
  }, [filters.q]);

  function rememberRecent(q: string) {
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, MAX_RECENT);
    setRecent(next);
    writeStore(recentKey, next);
  }

  /**
   * Turns finished tokens into filters and the rest into the free-text query. While typing, an
   * unfinished last token ("paid:bo") is kept in the box but left out of the search.
   */
  function commit(raw: string, final: boolean) {
    let complete = raw;
    let pending = "";
    if (!final && !/\s$/.test(raw)) {
      const m = raw.match(/^([\s\S]*?)(\S+)$/);
      if (m && looksLikeTokenStart(m[2])) {
        complete = m[1];
        pending = m[2];
      }
    }
    const parsed = parseSearch(complete, { people, groups, meId });
    const tookTokens = Object.keys(parsed.filters).length > 0;
    const q = parsed.text.slice(0, 100);
    if (tookTokens) {
      const rest = [q, pending].filter(Boolean).join(" ");
      setText(rest && !pending && /\s$/.test(raw) ? `${rest} ` : rest);
    }
    const current = filtersRef.current;
    if (!tookTokens && q === current.q) return;
    committedText.current = q;
    onChange({ ...mergeTokenFilters(current, parsed.filters), q });
    if (final && q) rememberRecent(q);
  }

  // Debounced live search while typing
  useEffect(() => {
    if (text === committedText.current) return;
    const t = setTimeout(() => commit(text, false), DEBOUNCE_MS);
    return () => clearTimeout(t);
    // commit reads the latest filters through a ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // "/" focuses the search box (unless you're already typing somewhere)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function apply(next: UrlFilters) {
    onChange(next);
  }

  function openFilters() {
    if (isDesktop) {
      setPanelOpen((o) => !o);
    } else {
      setDraft(filters);
      setPanelOpen(true);
    }
  }

  const count = activeFilterCount(filters);
  const nameOf = (id: string, list: Named[] = people) => (id === meId ? "You" : list.find((p) => p.id === id)?.name ?? "Someone");
  const money = (v: string) => `${sym}${v}`;
  const paidByMe = !!meId && filters.paidBy.length === 1 && filters.paidBy[0] === meId;

  // ---- Active filter chips
  const chips: { key: string; label: string; remove: () => UrlFilters }[] = [];
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, remove: () => ({ ...filters, q: "" }) });
  if (filters.match !== "contains")
    chips.push({ key: "match", label: filters.match === "starts" ? "Starts with" : "Typo-tolerant", remove: () => ({ ...filters, match: "contains" }) });
  if (filters.amount)
    chips.push({ key: "amount", label: `${filters.approx ? "≈" : "="} ${money(filters.amount)}`, remove: () => ({ ...filters, amount: "", approx: false }) });
  if (filters.minAmount || filters.maxAmount) {
    const label =
      filters.minAmount && filters.maxAmount
        ? `${money(filters.minAmount)} – ${money(filters.maxAmount)}`
        : filters.minAmount
          ? `≥ ${money(filters.minAmount)}`
          : `≤ ${money(filters.maxAmount)}`;
    chips.push({ key: "range", label, remove: () => ({ ...filters, minAmount: "", maxAmount: "" }) });
  }
  if (filters.from || filters.to) {
    const preset = matchDatePreset(filters.from, filters.to);
    const fmt = (d: string) => format(new Date(`${d}T00:00:00`), "d MMM yyyy");
    const range = preset
      ? DATE_PRESETS[preset]
      : filters.from && filters.to
        ? filters.from === filters.to
          ? fmt(filters.from)
          : `${fmt(filters.from)} – ${fmt(filters.to)}`
        : filters.from
          ? `From ${fmt(filters.from)}`
          : `Until ${fmt(filters.to)}`;
    chips.push({
      key: "date",
      label: filters.dateField === "added" ? `Added ${range.toLowerCase()}` : range,
      remove: () => ({ ...filters, from: "", to: "", dateField: "date" }),
    });
  }
  for (const id of filters.groupId) chips.push({ key: `g-${id}`, label: nameOf(id, groups), remove: () => ({ ...filters, groupId: filters.groupId.filter((x) => x !== id) }) });
  for (const id of filters.paidBy) chips.push({ key: `p-${id}`, label: `Paid by ${nameOf(id)}`, remove: () => ({ ...filters, paidBy: filters.paidBy.filter((x) => x !== id) }) });
  for (const id of filters.involving) chips.push({ key: `w-${id}`, label: `With ${nameOf(id)}`, remove: () => ({ ...filters, involving: filters.involving.filter((x) => x !== id) }) });
  for (const id of filters.addedBy) chips.push({ key: `a-${id}`, label: `Added by ${nameOf(id)}`, remove: () => ({ ...filters, addedBy: filters.addedBy.filter((x) => x !== id) }) });
  for (const t of filters.splitType) chips.push({ key: `t-${t}`, label: SPLIT_LABELS[t] ?? t, remove: () => ({ ...filters, splitType: filters.splitType.filter((x) => x !== t) }) });
  if (filters.status !== "active")
    chips.push({ key: "status", label: filters.status === "edited" ? "Edited" : "Deleted", remove: () => ({ ...filters, status: "active" }) });

  // ---- Saved and recent searches
  const savedItems: MenuItem[] = [
    ...saved.map((s) => ({ label: s.name, onSelect: () => apply(readUrlFilters(new URLSearchParams(s.query))) })),
    ...recent.map((r) => ({ label: `Recent: ${r}`, onSelect: () => apply({ ...filters, q: r }) })),
  ];
  if (count > 0 || filters.q) {
    savedItems.push({ label: "Save these filters…", onSelect: () => { setSaveName(""); setSaveOpen(true); } });
  }
  if (savedItems.length === 0) {
    savedItems.push({ label: "No saved searches yet", onSelect: () => document.getElementById(`${uid}-q`)?.focus() });
  }
  if (saved.length || recent.length) {
    savedItems.push({
      label: "Clear saved and recent",
      tone: "danger",
      onSelect: () => {
        setSaved([]);
        setRecent([]);
        writeStore(savedKey, []);
        writeStore(recentKey, []);
      },
    });
  }

  function saveCurrent() {
    const name = saveName.trim().slice(0, 40);
    if (!name) return;
    const query = writeUrlFilters({ ...filters, sort: filters.sort }).toString();
    const next = [{ name, query }, ...saved.filter((s) => s.name !== name)].slice(0, 12);
    setSaved(next);
    writeStore(savedKey, next);
    setSaveOpen(false);
  }

  const panelId = `${uid}-filters`;

  return (
    <div className="space-y-3">
      <div className="relative">
        <label htmlFor={`${uid}-q`} className="sr-only">Search expenses</label>
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>
        <input
          ref={inputRef}
          id={`${uid}-q`}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(text, true);
            }
          }}
          onBlur={() => text !== committedText.current && commit(text, true)}
          placeholder="Search, or try paid:me >500 date:last30"
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby={`${uid}-hint`}
          className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-10 text-base text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] sm:text-sm"
        />
        <kbd aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--border)] px-1.5 text-[10px] text-[var(--foreground-subtle)] md:block">
          /
        </kbd>
        <p id={`${uid}-hint`} className="sr-only">
          Searches descriptions and people. Shortcuts: paid:name, with:name, greater than 500 as &gt;500, date:last30, type:exact.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openFilters}
          aria-expanded={isDesktop ? panelOpen : undefined}
          aria-controls={isDesktop ? panelId : undefined}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm font-medium text-[var(--foreground)] hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18M6.75 12h10.5M10.5 19.5h3" />
          </svg>
          Filters
          {count > 0 && (
            <span className="rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-semibold text-white">
              {count}
              <span className="sr-only"> active</span>
            </span>
          )}
        </button>

        {meId && (
          <button
            type="button"
            aria-pressed={paidByMe}
            onClick={() => apply({ ...filters, paidBy: paidByMe ? [] : [meId] })}
            className="inline-flex min-h-[40px] items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--foreground)] hover:border-[var(--accent)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-dim)] aria-pressed:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            Paid by me
          </button>
        )}

        <label className="ml-auto inline-flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
          <span className="sr-only sm:not-sr-only">Sort</span>
          <select
            value={filters.sort}
            onChange={(e) => apply({ ...filters, sort: e.target.value as UrlFilters["sort"] })}
            aria-label="Sort expenses"
            className="min-h-[40px] rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        {(
          <DropdownMenu
            label="Saved searches"
            trigger={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
            }
            items={savedItems}
          />
        )}
      </div>

      {isDesktop && panelOpen && (
        <div id={panelId} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <FilterPanel value={filters} onChange={apply} people={people} groups={groups} meId={meId} />
        </div>
      )}

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => apply(c.remove())}
                aria-label={`Remove filter: ${c.label}`}
                className="inline-flex min-h-[32px] max-w-[16rem] items-center gap-1.5 rounded-full bg-[var(--accent-dim)] px-3 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
              >
                <span className="truncate">{c.label}</span>
                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => apply({ ...EMPTY_FILTERS, sort: filters.sort })}
              className="min-h-[32px] px-1 text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              Clear all
            </button>
          </li>
        </ul>
      )}

      {/* Phones: filters in a bottom sheet, applied together */}
      <Modal
        open={!isDesktop && panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Filters"
        size="lg"
        variant="sheet"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft({ ...EMPTY_FILTERS, q: filters.q, sort: filters.sort })}>
              Reset
            </Button>
            <Button
              onClick={() => {
                apply(draft);
                setPanelOpen(false);
              }}
            >
              Apply
            </Button>
          </>
        }
      >
        <FilterPanel value={draft} onChange={setDraft} people={people} groups={groups} meId={meId} />
      </Modal>

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Save these filters" size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveCurrent();
          }}
          className="space-y-4"
        >
          <Input label="Name" value={saveName} maxLength={40} onChange={(e) => setSaveName(e.target.value)} placeholder="e.g. My rent items" autoFocus />
          <p className="text-xs text-[var(--foreground-muted)]">Saved on this device.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!saveName.trim()}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
