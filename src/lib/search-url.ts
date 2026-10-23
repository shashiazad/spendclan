import { endOfDay, startOfDay } from "date-fns";
import type { TokenFilters } from "./search-tokens";

/**
 * Expense filters as they live in the page URL (?q=&paidBy=&min=…). Shareable and survive
 * refresh/back. Dates are local calendar days; `toApiQuery` turns them into instants.
 */
export interface UrlFilters {
  q: string;
  match: "contains" | "starts" | "fuzzy";
  amount: string;
  approx: boolean;
  minAmount: string;
  maxAmount: string;
  paidBy: string[];
  involving: string[];
  addedBy: string[];
  groupId: string[];
  splitType: string[];
  from: string;
  to: string;
  dateField: "date" | "added";
  status: "active" | "edited" | "deleted";
  sort: "newest" | "oldest" | "amount_desc" | "amount_asc" | "description" | "edited";
}

export const EMPTY_FILTERS: UrlFilters = {
  q: "",
  match: "contains",
  amount: "",
  approx: false,
  minAmount: "",
  maxAmount: "",
  paidBy: [],
  involving: [],
  addedBy: [],
  groupId: [],
  splitType: [],
  from: "",
  to: "",
  dateField: "date",
  status: "active",
  sort: "newest",
};

// Short URL keys for the long field names
const URL_KEYS: Record<keyof UrlFilters, string> = {
  q: "q",
  match: "match",
  amount: "amount",
  approx: "approx",
  minAmount: "min",
  maxAmount: "max",
  paidBy: "paidBy",
  involving: "with",
  addedBy: "addedBy",
  groupId: "group",
  splitType: "type",
  from: "from",
  to: "to",
  dateField: "dateField",
  status: "status",
  sort: "sort",
};

const LIST_FIELDS = ["paidBy", "involving", "addedBy", "groupId", "splitType"] as const;
type ListField = (typeof LIST_FIELDS)[number];
const isList = (k: keyof UrlFilters): k is ListField => (LIST_FIELDS as readonly string[]).includes(k);

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Reads filters from the URL, ignoring anything malformed. */
export function readUrlFilters(params: URLSearchParams): UrlFilters {
  const list = (k: keyof UrlFilters) =>
    params
      .getAll(URL_KEYS[k])
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 20);
  const text = (k: keyof UrlFilters) => (params.get(URL_KEYS[k]) ?? "").trim();
  return {
    q: text("q").slice(0, 100),
    match: oneOf(params.get("match"), ["contains", "starts", "fuzzy"] as const, "contains"),
    amount: text("amount"),
    approx: params.get("approx") === "1",
    minAmount: text("minAmount"),
    maxAmount: text("maxAmount"),
    paidBy: list("paidBy"),
    involving: list("involving"),
    addedBy: list("addedBy"),
    groupId: list("groupId"),
    splitType: list("splitType").filter((t) => ["EQUAL", "CUSTOM", "PERCENTAGE", "RATIO"].includes(t)),
    from: /^\d{4}-\d{2}-\d{2}$/.test(text("from")) ? text("from") : "",
    to: /^\d{4}-\d{2}-\d{2}$/.test(text("to")) ? text("to") : "",
    dateField: oneOf(params.get("dateField"), ["date", "added"] as const, "date"),
    status: oneOf(params.get("status"), ["active", "edited", "deleted"] as const, "active"),
    sort: oneOf(params.get("sort"), ["newest", "oldest", "amount_desc", "amount_asc", "description", "edited"] as const, "newest"),
  };
}

/** Filters → URL params, leaving out defaults so URLs stay short. */
export function writeUrlFilters(f: UrlFilters, base?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base);
  for (const k of Object.keys(URL_KEYS) as (keyof UrlFilters)[]) params.delete(URL_KEYS[k]);
  for (const k of Object.keys(URL_KEYS) as (keyof UrlFilters)[]) {
    const v = f[k];
    if (isList(k)) {
      if ((v as string[]).length) params.set(URL_KEYS[k], (v as string[]).join(","));
    } else if (k === "approx") {
      if (v) params.set("approx", "1");
    } else if (v !== EMPTY_FILTERS[k] && v !== "") {
      params.set(URL_KEYS[k], String(v));
    }
  }
  return params;
}

/** True when anything other than the sort order narrows the results. */
export function hasActiveFilters(f: UrlFilters): boolean {
  return activeFilterCount(f) > 0 || f.q.trim() !== "";
}

/** Number of filters set, not counting the search text or sort (for the "Filters (3)" badge). */
export function activeFilterCount(f: UrlFilters): number {
  let n = 0;
  if (f.amount || f.minAmount || f.maxAmount) n++;
  if (f.from || f.to) n++;
  if (f.match !== "contains") n++;
  if (f.status !== "active") n++;
  for (const k of LIST_FIELDS) if (f[k].length) n++;
  return n;
}

/** Applies parsed search-box tokens on top of the current filters. */
export function mergeTokenFilters(f: UrlFilters, t: TokenFilters): UrlFilters {
  const union = (a: string[], b?: string[]) => (b ? [...new Set([...a, ...b])] : a);
  return {
    ...f,
    paidBy: union(f.paidBy, t.paidBy),
    involving: union(f.involving, t.involving),
    addedBy: union(f.addedBy, t.addedBy),
    groupId: union(f.groupId, t.groupId),
    splitType: union(f.splitType, t.splitType),
    ...(t.amount !== undefined && { amount: t.amount, approx: !!t.approx, minAmount: "", maxAmount: "" }),
    ...(t.minAmount !== undefined && { minAmount: t.minAmount, amount: "" }),
    ...(t.maxAmount !== undefined && { maxAmount: t.maxAmount, amount: "" }),
    ...(t.from !== undefined && { from: t.from, to: t.to ?? "" }),
    ...(t.status && { status: t.status }),
  };
}

/** Builds the API query string: local days become instants in the viewer's timezone. */
export function toApiQuery(f: UrlFilters, page: { cursor?: string | null; limit?: number } = {}): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.match !== "contains") p.set("match", f.match);
  if (f.amount) {
    p.set("amount", f.amount);
    if (f.approx) p.set("approx", "1");
  }
  if (f.minAmount) p.set("minAmount", f.minAmount);
  if (f.maxAmount) p.set("maxAmount", f.maxAmount);
  for (const k of LIST_FIELDS) if (f[k].length) p.set(k, f[k].join(","));
  if (f.from) p.set("from", startOfDay(new Date(`${f.from}T00:00:00`)).toISOString());
  if (f.to) p.set("to", endOfDay(new Date(`${f.to}T00:00:00`)).toISOString());
  if (f.dateField !== "date") p.set("dateField", f.dateField);
  if (f.status !== "active") p.set("status", f.status);
  p.set("sort", f.sort);
  p.set("limit", String(page.limit ?? 20));
  if (page.cursor) p.set("cursor", page.cursor);
  return p;
}
