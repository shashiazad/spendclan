import { describe, expect, it } from "vitest";
import {
  CursorError,
  buildExpenseWhere,
  buildOrderBy,
  cursorWhere,
  encodeCursor,
  hasSearchParams,
  paramsToObject,
  parseMoney,
  searchSchema,
  toMinor,
  type SearchFilters,
} from "./expense-search";

const ME = "00000000-0000-4000-8000-00000000000a";
const BOB = "00000000-0000-4000-8000-00000000000b";
const CAROL = "00000000-0000-4000-8000-00000000000c";
const G1 = "10000000-0000-4000-8000-000000000001";

const parse = (qs: string) => searchSchema.safeParse(paramsToObject(new URLSearchParams(qs)));
const filters = (qs: string): SearchFilters => {
  const r = parse(qs);
  if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  return r.data;
};
const where = (qs: string, extra: { fuzzyIds?: string[] } = {}) =>
  buildExpenseWhere(filters(qs), { userId: ME, groupIds: [G1], ...extra }).AND as Record<string, unknown>[];

describe("parseMoney", () => {
  it.each([
    ["500", 500],
    ["1,200.50", 1200.5],
    ["₹1,200", 1200],
    ["$ 12.5", 12.5],
    ["INR 99", 99],
    ["0", 0],
  ])("parses %s", (input, expected) => expect(parseMoney(input)).toBe(expected));

  it.each(["", "abc", "-5", "1.234", "1e3", "12.5.1"])("rejects %s", (input) => expect(parseMoney(input)).toBeNull());
});

describe("paramsToObject", () => {
  it("reads repeated and comma-separated list keys, and drops empty values", () => {
    expect(paramsToObject(new URLSearchParams(`paidBy=${ME}&paidBy=${BOB},${CAROL}&q=&sort=oldest`))).toEqual({
      paidBy: [ME, BOB, CAROL],
      sort: "oldest",
    });
  });

  it("keeps commas inside non-list values", () => {
    expect(paramsToObject(new URLSearchParams("amount=1,200"))).toEqual({ amount: "1,200" });
  });
});

describe("hasSearchParams", () => {
  it("is false for a plain listing and true for any search key", () => {
    expect(hasSearchParams(new URLSearchParams(""))).toBe(false);
    expect(hasSearchParams(new URLSearchParams("utm=x"))).toBe(false);
    expect(hasSearchParams(new URLSearchParams("sort=newest"))).toBe(true);
  });
});

describe("searchSchema", () => {
  it("applies defaults", () => {
    expect(filters("")).toMatchObject({ match: "contains", status: "active", sort: "newest", limit: 20, approx: false, paidBy: [] });
  });

  it("caps the page size, list sizes and text length", () => {
    expect(parse("limit=51").success).toBe(false);
    expect(parse("limit=0").success).toBe(false);
    expect(parse(`paidBy=${Array(21).fill(ME).join(",")}`).success).toBe(false);
    expect(parse(`q=${"x".repeat(101)}`).success).toBe(false);
  });

  it("rejects malformed values", () => {
    expect(parse("paidBy=not-a-uuid").success).toBe(false);
    expect(parse("amount=abc").success).toBe(false);
    expect(parse("from=yesterday").success).toBe(false);
    expect(parse("sort=random").success).toBe(false);
    expect(parse("splitType=SHARES").success).toBe(false);
  });

  it("rejects inverted ranges", () => {
    expect(parse("minAmount=500&maxAmount=100").success).toBe(false);
    expect(parse("from=2026-10-05&to=2026-10-01").success).toBe(false);
    expect(parse("from=2026-10-05&to=2026-10-05").success).toBe(true);
  });
});

describe("buildExpenseWhere", () => {
  it("always limits to the allowed groups and active rows", () => {
    expect(where("")).toEqual([{ groupId: { in: [G1] } }, { deletedAt: null }]);
  });

  it("free text matches description, payer and anyone in the split", () => {
    expect(where("q=hotel")[2]).toEqual({
      OR: [
        { description: { contains: "hotel", mode: "insensitive" } },
        { paidBy: { name: { contains: "hotel", mode: "insensitive" } } },
        { splits: { some: { amount: { gt: 0 }, user: { name: { contains: "hotel", mode: "insensitive" } } } } },
      ],
    });
  });

  it("starts-with only looks at the description", () => {
    expect(where("q=Ho&match=starts")[2]).toEqual({ description: { startsWith: "Ho", mode: "insensitive" } });
  });

  it("fuzzy adds the similar ids to the text match", () => {
    const or = (where("q=hotle&match=fuzzy", { fuzzyIds: ["x1"] })[2] as { OR: unknown[] }).OR;
    expect(or).toContainEqual({ id: { in: ["x1"] } });
    expect(or).toContainEqual({ description: { contains: "hotle", mode: "insensitive" } });
  });

  it("exact amount uses a half-paisa window, approx ±5%", () => {
    expect(where("amount=1,200")[2]).toEqual({ amount: { gte: 1199.995, lte: 1200.005 } });
    expect(where("amount=1000&approx=1")[2]).toEqual({ amount: { gte: 950, lte: 1050 } });
  });

  it("min and max are inclusive", () => {
    expect(where("minAmount=100&maxAmount=500").slice(2)).toEqual([
      { amount: { gte: 99.995 } },
      { amount: { lte: 500.005 } },
    ]);
  });

  it("filters by payer, people in the split and who added it", () => {
    expect(where(`paidBy=${BOB}&involving=${CAROL}&addedBy=${ME}`).slice(2)).toEqual([
      { paidById: { in: [BOB] } },
      { splits: { some: { userId: { in: [CAROL] }, amount: { gt: 0 } } } },
      { createdById: { in: [ME] } },
    ]);
  });

  it("date-only bounds cover whole days; dateField=added uses createdAt", () => {
    expect(where("from=2026-10-01&to=2026-10-05")[2]).toEqual({
      date: { gte: new Date("2026-10-01T00:00:00.000Z"), lte: new Date("2026-10-05T23:59:59.999Z") },
    });
    expect(where("from=2026-10-01T05:30:00.000Z&dateField=added")[2]).toEqual({
      createdAt: { gte: new Date("2026-10-01T05:30:00.000Z") },
    });
  });

  it("filters by split type", () => {
    expect(where("splitType=CUSTOM,PERCENTAGE")[2]).toEqual({ splitType: { in: ["CUSTOM", "PERCENTAGE"] } });
  });

  it("edited means it has a revision", () => {
    expect(where("status=edited").slice(1)).toEqual([{ deletedAt: null }, { revisions: { some: {} } }]);
  });

  it("deleted entries are limited to their owner or a group admin", () => {
    expect(where("status=deleted")[1]).toEqual({
      deletedAt: { not: null },
      OR: [
        { createdById: ME },
        { createdById: null, paidById: ME },
        { group: { members: { some: { userId: ME, role: "ADMIN", removedAt: null } } } },
      ],
    });
  });

  it("combines every filter with AND", () => {
    const all = where(`q=a&amount=5&paidBy=${BOB}&involving=${ME}&addedBy=${ME}&from=2026-01-01&splitType=EQUAL&status=edited`);
    expect(all).toHaveLength(10);
  });
});

describe("sorting and cursors", () => {
  const row = { id: "e2", date: new Date("2026-10-02T00:00:00.000Z"), amount: 250, description: "Taxi", updatedAt: new Date("2026-10-03T00:00:00.000Z") };

  it("orders by the sort field with id as the tie-breaker", () => {
    expect(buildOrderBy("newest")).toEqual([{ date: "desc" }, { id: "desc" }]);
    expect(buildOrderBy("amount_asc")).toEqual([{ amount: "asc" }, { id: "asc" }]);
    expect(buildOrderBy("description")).toEqual([{ description: "asc" }, { id: "asc" }]);
  });

  it("round-trips a cursor into a keyset condition", () => {
    expect(cursorWhere(encodeCursor(row, "newest"), "newest")).toEqual({
      OR: [{ date: { lt: row.date } }, { date: row.date, id: { lt: "e2" } }],
    });
    expect(cursorWhere(encodeCursor(row, "amount_asc"), "amount_asc")).toEqual({
      OR: [{ amount: { gt: 250 } }, { amount: 250, id: { gt: "e2" } }],
    });
  });

  it("rejects tampered cursors and cursors from another sort", () => {
    expect(() => cursorWhere("nope", "newest")).toThrow(CursorError);
    expect(() => cursorWhere(encodeCursor(row, "newest"), "oldest")).toThrow(CursorError);
    const bad = Buffer.from(JSON.stringify(["amount_desc", "DROP", "e2"])).toString("base64url");
    expect(() => cursorWhere(bad, "amount_desc")).toThrow(CursorError);
  });
});

describe("toMinor", () => {
  it("rounds float sums to whole paise", () => {
    expect(toMinor(0.1 + 0.2)).toBe(30);
    expect(toMinor(1200.005)).toBe(120001);
  });
});
