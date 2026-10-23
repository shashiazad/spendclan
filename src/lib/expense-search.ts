import { z } from "zod";
import type { Prisma } from "@prisma/client";

/**
 * Expense search: query-string validation, the filter → Prisma `where` builder, sorting and
 * keyset cursors. Pure (no database access) so it can be unit tested; see expense-search-server.ts.
 */

export const SORTS = ["newest", "oldest", "amount_desc", "amount_asc", "description", "edited"] as const;
export const MATCH_MODES = ["contains", "starts", "fuzzy"] as const;
export const STATUSES = ["active", "deleted", "edited"] as const;
export const SEARCH_SPLIT_TYPES = ["EQUAL", "CUSTOM", "PERCENTAGE", "RATIO"] as const;
export const DATE_FIELDS = ["date", "added"] as const;
export const MAX_LIST = 20;
export const MAX_LIMIT = 50;
export const DEFAULT_LIMIT = 20;
/** "≈ amount" matches within this fraction either side. */
export const APPROX_TOLERANCE = 0.05;

export type SearchSort = (typeof SORTS)[number];

/** Keys whose value is a list (repeated `?k=a&k=b` or comma-separated `?k=a,b`). */
const LIST_KEYS = ["paidBy", "involving", "addedBy", "groupId", "splitType"] as const;

/**
 * Parses a money string the way people type it: "1200", "1,200.50", "₹1,200", "$ 12.5".
 * Returns null when it isn't a non-negative amount with at most two decimals.
 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[\s,₹$€£]/g, "").replace(/^(INR|USD|EUR|GBP)/i, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

const money = z
  .string()
  .max(32)
  .transform((v, ctx) => {
    const n = parseMoney(v);
    if (n === null) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 500 or 1,200.50" });
      return z.NEVER;
    }
    return n;
  });

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const dateBound = z
  .string()
  .max(40)
  .refine((v) => (DATE_ONLY.test(v) || v.includes("T")) && !Number.isNaN(Date.parse(v)), "Use YYYY-MM-DD or an ISO date-time");

const ids = z.array(z.string().uuid()).max(MAX_LIST, `At most ${MAX_LIST} values`).default([]);
const flag = z.enum(["1", "true", "0", "false"]).transform((v) => v === "1" || v === "true");

export const searchSchema = z
  .object({
    q: z.string().trim().max(100, "Search text is limited to 100 characters").optional(),
    match: z.enum(MATCH_MODES).default("contains"),
    amount: money.optional(),
    approx: flag.default(false),
    minAmount: money.optional(),
    maxAmount: money.optional(),
    paidBy: ids,
    involving: ids,
    addedBy: ids,
    groupId: ids,
    splitType: z.array(z.enum(SEARCH_SPLIT_TYPES)).max(SEARCH_SPLIT_TYPES.length).default([]),
    from: dateBound.optional(),
    to: dateBound.optional(),
    dateField: z.enum(DATE_FIELDS).default("date"),
    status: z.enum(STATUSES).default("active"),
    sort: z.enum(SORTS).default("newest"),
    cursor: z.string().max(500).optional(),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  })
  .refine((f) => f.minAmount === undefined || f.maxAmount === undefined || f.minAmount <= f.maxAmount, {
    message: "Minimum amount is more than the maximum",
    path: ["minAmount"],
  })
  .refine((f) => !f.from || !f.to || boundStart(f.from) <= boundEnd(f.to), {
    message: "The start date is after the end date",
    path: ["from"],
  });

export type SearchFilters = z.infer<typeof searchSchema>;

/** Turns URL search params into the plain object `searchSchema` expects. Empty values are dropped. */
export function paramsToObject(params: URLSearchParams): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params
      .getAll(key)
      .flatMap((v) => ((LIST_KEYS as readonly string[]).includes(key) ? v.split(",") : [v]))
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length === 0) continue;
    out[key] = (LIST_KEYS as readonly string[]).includes(key) ? values : values[values.length - 1];
  }
  return out;
}

/** Search-relevant keys; a request with none of them is a plain listing. */
export const SEARCH_KEYS = [
  "q", "match", "amount", "approx", "minAmount", "maxAmount", "paidBy", "involving", "addedBy",
  "groupId", "splitType", "from", "to", "dateField", "status", "sort", "cursor", "limit",
] as const;

export function hasSearchParams(params: URLSearchParams): boolean {
  return SEARCH_KEYS.some((k) => params.has(k));
}

/** A date-only bound covers the whole UTC day; a date-time is used as given. */
function boundStart(v: string): Date {
  return new Date(DATE_ONLY.test(v) ? `${v}T00:00:00.000Z` : v);
}
function boundEnd(v: string): Date {
  return DATE_ONLY.test(v) ? new Date(Date.parse(`${v}T00:00:00.000Z`) + 86_400_000 - 1) : new Date(v);
}

// Amounts are stored as floats; compare against a half-paisa window instead of exact equality
const HALF_MINOR = 0.005;

export interface WhereContext {
  userId: string;
  /** Groups the caller may search: already limited to active memberships (and any groupId filter). */
  groupIds: string[];
  /** For match=fuzzy: ids of expenses whose description is similar to `q` (from pg_trgm). */
  fuzzyIds?: string[];
}

export function buildExpenseWhere(f: SearchFilters, ctx: WhereContext): Prisma.GroupExpenseWhereInput {
  const and: Prisma.GroupExpenseWhereInput[] = [{ groupId: { in: ctx.groupIds } }];

  // Status
  if (f.status === "deleted") {
    // Deleted entries are visible to whoever could restore them, and to group admins
    and.push({
      deletedAt: { not: null },
      OR: [
        { createdById: ctx.userId },
        { createdById: null, paidById: ctx.userId },
        { group: { members: { some: { userId: ctx.userId, role: "ADMIN", removedAt: null } } } },
      ],
    });
  } else {
    and.push({ deletedAt: null });
    if (f.status === "edited") and.push({ revisions: { some: {} } });
  }

  // Free text
  const q = f.q?.trim();
  if (q) {
    const text = { contains: q, mode: "insensitive" as const };
    if (f.match === "starts") {
      and.push({ description: { startsWith: q, mode: "insensitive" } });
    } else {
      const or: Prisma.GroupExpenseWhereInput[] = [
        { description: text },
        { paidBy: { name: text } },
        { splits: { some: { amount: { gt: 0 }, user: { name: text } } } },
      ];
      if (f.match === "fuzzy" && ctx.fuzzyIds?.length) or.push({ id: { in: ctx.fuzzyIds } });
      and.push({ OR: or });
    }
  }

  // Amount
  if (f.amount !== undefined) {
    const spread = f.approx ? Math.max(f.amount * APPROX_TOLERANCE, HALF_MINOR) : HALF_MINOR;
    and.push({ amount: { gte: f.amount - spread, lte: f.amount + spread } });
  }
  if (f.minAmount !== undefined) and.push({ amount: { gte: f.minAmount - HALF_MINOR } });
  if (f.maxAmount !== undefined) and.push({ amount: { lte: f.maxAmount + HALF_MINOR } });

  // People
  if (f.paidBy.length) and.push({ paidById: { in: f.paidBy } });
  if (f.involving.length) and.push({ splits: { some: { userId: { in: f.involving }, amount: { gt: 0 } } } });
  if (f.addedBy.length) and.push({ createdById: { in: f.addedBy } });

  // Dates
  const dateKey = f.dateField === "added" ? "createdAt" : "date";
  if (f.from || f.to) {
    and.push({
      [dateKey]: {
        ...(f.from && { gte: boundStart(f.from) }),
        ...(f.to && { lte: boundEnd(f.to) }),
      },
    });
  }

  if (f.splitType.length) and.push({ splitType: { in: f.splitType } });

  return { AND: and };
}

// ---- Sorting and keyset pagination

type SortField = "date" | "amount" | "description" | "updatedAt";
const SORT_SPECS: Record<SearchSort, { field: SortField; dir: "asc" | "desc" }> = {
  newest: { field: "date", dir: "desc" },
  oldest: { field: "date", dir: "asc" },
  amount_desc: { field: "amount", dir: "desc" },
  amount_asc: { field: "amount", dir: "asc" },
  description: { field: "description", dir: "asc" },
  edited: { field: "updatedAt", dir: "desc" },
};

export function buildOrderBy(sort: SearchSort): Prisma.GroupExpenseOrderByWithRelationInput[] {
  const { field, dir } = SORT_SPECS[sort];
  return [{ [field]: dir }, { id: dir }];
}

type CursorValue = string | number;
interface SortableRow {
  id: string;
  date: Date;
  amount: number;
  description: string;
  updatedAt: Date;
}

export function encodeCursor(row: SortableRow, sort: SearchSort): string {
  const { field } = SORT_SPECS[sort];
  const raw = row[field];
  const value: CursorValue = raw instanceof Date ? raw.toISOString() : raw;
  return Buffer.from(JSON.stringify([sort, value, row.id])).toString("base64url");
}

export class CursorError extends Error {}

/** The `where` that continues after the row a cursor points at. Throws CursorError when invalid. */
export function cursorWhere(cursor: string, sort: SearchSort): Prisma.GroupExpenseWhereInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new CursorError("Invalid cursor");
  }
  if (!Array.isArray(parsed) || parsed.length !== 3 || parsed[0] !== sort || typeof parsed[2] !== "string") {
    throw new CursorError("Invalid cursor");
  }
  const { field, dir } = SORT_SPECS[sort];
  const [, rawValue, id] = parsed as [string, CursorValue, string];
  let value: Date | number | string;
  if (field === "date" || field === "updatedAt") {
    if (typeof rawValue !== "string" || Number.isNaN(Date.parse(rawValue))) throw new CursorError("Invalid cursor");
    value = new Date(rawValue);
  } else if (field === "amount") {
    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) throw new CursorError("Invalid cursor");
    value = rawValue;
  } else {
    if (typeof rawValue !== "string") throw new CursorError("Invalid cursor");
    value = rawValue;
  }
  const op = dir === "desc" ? "lt" : "gt";
  return { OR: [{ [field]: { [op]: value } }, { [field]: value, id: { [op]: id } }] };
}

/** Converts an amount to integer minor units (paise/cents) for totals. */
export function toMinor(amount: number): number {
  return Math.round(amount * 100);
}
