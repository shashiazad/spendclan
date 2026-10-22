import { endOfMonth, endOfYear, format, startOfMonth, startOfYear, subDays, subMonths } from "date-fns";
import { parseMoney } from "./expense-search";

/**
 * The search box understands a few power-user tokens alongside free text:
 *   paid:amit  with:varun  by:me  group:goa  >500  <=1200  =500  ~500  amount:100-500
 *   date:2026-10  date:2026-10-05  date:last30  date:2026-10-01..2026-10-05  type:custom  is:edited
 * Quoted phrases stay free text. Anything not understood stays free text too.
 * Dates are local calendar days (YYYY-MM-DD); the page converts them to instants for the API.
 */

export interface Named {
  id: string;
  name: string;
}

export interface TokenFilters {
  paidBy?: string[];
  involving?: string[];
  addedBy?: string[];
  groupId?: string[];
  amount?: string;
  approx?: boolean;
  minAmount?: string;
  maxAmount?: string;
  from?: string;
  to?: string;
  splitType?: string[];
  status?: "edited" | "deleted";
}

export interface ParsedSearch {
  /** Free text left after the tokens are taken out. */
  text: string;
  filters: TokenFilters;
}

export interface ParseContext {
  people: Named[];
  groups?: Named[];
  meId?: string;
  now?: Date;
}

export const DATE_PRESETS = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  thismonth: "This month",
  lastmonth: "Last month",
  thisyear: "This year",
} as const;
export type DatePreset = keyof typeof DATE_PRESETS;

const day = (d: Date) => format(d, "yyyy-MM-dd");

/** A named date range as local calendar days. */
export function datePresetRange(preset: DatePreset, now = new Date()): { from: string; to: string } {
  switch (preset) {
    case "today":
      return { from: day(now), to: day(now) };
    case "yesterday":
      return { from: day(subDays(now, 1)), to: day(subDays(now, 1)) };
    case "last7":
      return { from: day(subDays(now, 6)), to: day(now) };
    case "last30":
      return { from: day(subDays(now, 29)), to: day(now) };
    case "thismonth":
      return { from: day(startOfMonth(now)), to: day(endOfMonth(now)) };
    case "lastmonth": {
      const m = subMonths(now, 1);
      return { from: day(startOfMonth(m)), to: day(endOfMonth(m)) };
    }
    case "thisyear":
      return { from: day(startOfYear(now)), to: day(endOfYear(now)) };
  }
}

/** Which preset a from/to pair is, if any (so the UI can show "Last 30 days" instead of dates). */
export function matchDatePreset(from: string | undefined, to: string | undefined, now = new Date()): DatePreset | null {
  if (!from || !to) return null;
  for (const p of Object.keys(DATE_PRESETS) as DatePreset[]) {
    const r = datePresetRange(p, now);
    if (r.from === from && r.to === to) return p;
  }
  return null;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;
const ISO_YEAR = /^\d{4}$/;

function validDay(v: string) {
  return ISO_DAY.test(v) && day(new Date(`${v}T00:00:00`)) === v;
}

function parseDate(value: string, now: Date): { from: string; to: string } | null {
  const v = value.toLowerCase();
  if (v in DATE_PRESETS) return datePresetRange(v as DatePreset, now);
  if (ISO_DAY.test(v)) return validDay(v) ? { from: v, to: v } : null;
  if (ISO_MONTH.test(v)) {
    const d = new Date(`${v}-01T00:00:00`);
    return Number.isNaN(d.getTime()) || format(d, "yyyy-MM") !== v ? null : { from: day(startOfMonth(d)), to: day(endOfMonth(d)) };
  }
  if (ISO_YEAR.test(v)) return { from: `${v}-01-01`, to: `${v}-12-31` };
  const range = v.split("..");
  if (range.length === 2 && validDay(range[0]) && validDay(range[1]) && range[0] <= range[1]) {
    return { from: range[0], to: range[1] };
  }
  return null;
}

const SPLIT_ALIASES: Record<string, string> = {
  equal: "EQUAL",
  equally: "EQUAL",
  exact: "CUSTOM",
  custom: "CUSTOM",
  amounts: "CUSTOM",
  percent: "PERCENTAGE",
  percentage: "PERCENTAGE",
  "%": "PERCENTAGE",
};

/** Finds people by name: "me"/"you", exact name, exact first name, then a unique prefix. */
export function matchNamed(query: string, list: Named[], meId?: string): Named | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  if ((q === "me" || q === "you" || q === "i") && meId) return list.find((p) => p.id === meId) ?? { id: meId, name: "You" };
  const exact = list.filter((p) => p.name.toLowerCase() === q);
  if (exact.length === 1) return exact[0];
  const first = list.filter((p) => p.name.toLowerCase().split(/\s+/)[0] === q);
  if (first.length === 1) return first[0];
  const prefix = list.filter((p) => p.name.toLowerCase().startsWith(q));
  return prefix.length === 1 ? prefix[0] : null;
}

const add = (list: string[] | undefined, id: string) => (list?.includes(id) ? list : [...(list ?? []), id]);
const cents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => (c / 100).toFixed(2).replace(/\.00$/, "");

/** Applies one token to `filters`. Returns false when the token isn't understood (it stays text). */
function applyToken(token: string, filters: TokenFilters, ctx: Required<Pick<ParseContext, "now">> & ParseContext): boolean {
  // Amount comparisons: >500, >=500, <1200, <=1200, =500, ~500, ≈500
  const cmp = token.match(/^(>=|<=|>|<|=|~|≈)(.+)$/);
  if (cmp) {
    const n = parseMoney(cmp[2]);
    if (n === null) return false;
    switch (cmp[1]) {
      case ">":
        filters.minAmount = fromCents(cents(n) + 1);
        break;
      case ">=":
        filters.minAmount = fromCents(cents(n));
        break;
      case "<":
        if (cents(n) === 0) return false;
        filters.maxAmount = fromCents(cents(n) - 1);
        break;
      case "<=":
        filters.maxAmount = fromCents(cents(n));
        break;
      case "=":
        filters.amount = fromCents(cents(n));
        filters.approx = false;
        break;
      default:
        filters.amount = fromCents(cents(n));
        filters.approx = true;
    }
    return true;
  }

  const kv = token.match(/^([a-z]+):(.+)$/i);
  if (!kv) return false;
  const key = kv[1].toLowerCase();
  const value = kv[2];

  switch (key) {
    case "paid":
    case "paidby":
    case "with":
    case "by":
    case "added": {
      const names = value.split(",").filter(Boolean);
      const found = names.map((n) => matchNamed(n, ctx.people, ctx.meId));
      if (found.length === 0 || found.some((p) => !p)) return false;
      const field = key === "with" ? "involving" : key === "by" || key === "added" ? "addedBy" : "paidBy";
      for (const p of found as Named[]) filters[field] = add(filters[field], p.id);
      return true;
    }
    case "group": {
      const g = matchNamed(value, ctx.groups ?? []);
      if (!g) return false;
      filters.groupId = add(filters.groupId, g.id);
      return true;
    }
    case "amount": {
      const range = value.split("-");
      if (range.length === 2) {
        const lo = parseMoney(range[0]);
        const hi = parseMoney(range[1]);
        if (lo === null || hi === null || lo > hi) return false;
        filters.minAmount = fromCents(cents(lo));
        filters.maxAmount = fromCents(cents(hi));
        return true;
      }
      const n = parseMoney(value);
      if (n === null) return false;
      filters.amount = fromCents(cents(n));
      filters.approx = false;
      return true;
    }
    case "date": {
      const r = parseDate(value, ctx.now);
      if (!r) return false;
      filters.from = r.from;
      filters.to = r.to;
      return true;
    }
    case "type": {
      const t = SPLIT_ALIASES[value.toLowerCase()];
      if (!t) return false;
      filters.splitType = add(filters.splitType, t);
      return true;
    }
    case "is": {
      const v = value.toLowerCase();
      if (v !== "edited" && v !== "deleted") return false;
      filters.status = v;
      return true;
    }
    default:
      return false;
  }
}

/** Splits input into tokens, keeping "quoted phrases" together. */
function tokenize(input: string): { value: string; quoted: boolean }[] {
  const out: { value: string; quoted: boolean }[] = [];
  for (const m of input.matchAll(/"([^"]*)"?|(\S+)/g)) {
    if (m[1] !== undefined) {
      if (m[1].trim()) out.push({ value: m[1].trim(), quoted: true });
    } else out.push({ value: m[2], quoted: false });
  }
  return out;
}

export function parseSearch(input: string, ctx: ParseContext): ParsedSearch {
  const full = { ...ctx, now: ctx.now ?? new Date() };
  const filters: TokenFilters = {};
  const text: string[] = [];
  for (const t of tokenize(input)) {
    if (t.quoted || !applyToken(t.value, filters, full)) text.push(t.quoted && /\s/.test(t.value) ? t.value : t.value);
  }
  return { text: text.join(" "), filters };
}

/**
 * While typing, the last word may be an unfinished token ("paid:bo"). It is left out of the live
 * text search so results don't flash empty, and turned into a filter once it is finished.
 */
export function looksLikeTokenStart(word: string): boolean {
  return /^([a-z]+:|>=?|<=?|=|~|≈)/i.test(word);
}
