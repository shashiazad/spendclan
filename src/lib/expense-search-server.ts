import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { canModifyExpense } from "./group-permissions";
import { rateLimit } from "./rate-limit";
import {
  CursorError,
  buildExpenseWhere,
  buildOrderBy,
  cursorWhere,
  encodeCursor,
  paramsToObject,
  searchSchema,
  toMinor,
  type SearchFilters,
} from "./expense-search";

/** Description similarity (pg_trgm word_similarity) needed for a typo-tolerant match. */
const FUZZY_THRESHOLD = 0.3;
const FUZZY_MAX_IDS = 500;

const searchInclude = {
  paidBy: { select: { id: true, name: true } },
  splits: { include: { user: { select: { id: true, name: true } } } },
  group: { select: { id: true, name: true } },
  _count: { select: { revisions: true } },
} as const;

export interface SearchResult {
  items: unknown[];
  nextCursor: string | null;
  totalCount: number;
  totalAmountMinor: number;
}

/**
 * Runs an expense search for `userId` over `groupIds`, which the caller has already limited to
 * groups where the user is an active member. Pagination is keyset-based and never unbounded.
 */
export async function runExpenseSearch(userId: string, f: SearchFilters, groupIds: string[]): Promise<SearchResult> {
  if (groupIds.length === 0) return { items: [], nextCursor: null, totalCount: 0, totalAmountMinor: 0 };

  let fuzzyIds: string[] | undefined;
  const q = f.q?.trim();
  if (f.match === "fuzzy" && q) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "GroupExpense"
      WHERE "groupId" = ANY(${groupIds}::text[])
        AND word_similarity(${q}, description) >= ${FUZZY_THRESHOLD}
      ORDER BY word_similarity(${q}, description) DESC
      LIMIT ${FUZZY_MAX_IDS}`;
    fuzzyIds = rows.map((r) => r.id);
  }

  const where = buildExpenseWhere(f, { userId, groupIds, fuzzyIds });
  const pageWhere = f.cursor ? { AND: [where, cursorWhere(f.cursor, f.sort)] } : where;

  const [rows, totalCount, sum] = await Promise.all([
    prisma.groupExpense.findMany({
      where: pageWhere,
      include: searchInclude,
      orderBy: buildOrderBy(f.sort),
      take: f.limit + 1,
    }),
    prisma.groupExpense.count({ where }),
    prisma.groupExpense.aggregate({ where, _sum: { amount: true } }),
  ]);

  const page = rows.slice(0, f.limit);
  const last = page[page.length - 1];
  return {
    items: page.map(({ _count, ...e }) => ({
      ...e,
      edited: _count.revisions > 0,
      canEdit: !e.deletedAt && canModifyExpense(e, userId),
    })),
    nextCursor: rows.length > f.limit && last ? encodeCursor(last, f.sort) : null,
    totalCount,
    totalAmountMinor: toMinor(sum._sum.amount ?? 0),
  };
}

/** Requests per user per minute for the search endpoints. */
const SEARCH_RATE_LIMIT = 120;

/**
 * Shared GET handling for both search endpoints: rate limit, validation, and errors as JSON.
 * `groupIdsFor` returns the groups to search given the validated filters.
 */
export async function handleSearchRequest(
  request: Request,
  userId: string,
  groupIdsFor: (f: SearchFilters) => Promise<string[]> | string[],
): Promise<Response> {
  const limited = rateLimit(`expense-search:${userId}`, SEARCH_RATE_LIMIT, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many searches. Wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = searchSchema.safeParse(paramsToObject(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  try {
    return NextResponse.json(await runExpenseSearch(userId, parsed.data, await groupIdsFor(parsed.data)));
  } catch (error) {
    if (error instanceof CursorError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
