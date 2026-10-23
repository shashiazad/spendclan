import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, activeFilterCount, hasActiveFilters, mergeTokenFilters, readUrlFilters, toApiQuery, writeUrlFilters } from "./search-url";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

describe("URL filters", () => {
  it("round-trips through the URL with short keys and no defaults", () => {
    const f = { ...EMPTY_FILTERS, q: "hotel", paidBy: [A, B], minAmount: "100", approx: true, amount: "50", from: "2026-10-01", sort: "oldest" as const };
    const params = writeUrlFilters(f);
    expect(params.toString()).toBe(`q=hotel&amount=50&approx=1&min=100&paidBy=${A}%2C${B}&from=2026-10-01&sort=oldest`);
    expect(readUrlFilters(params)).toEqual(f);
  });

  it("keeps unrelated params and drops cleared ones", () => {
    const base = new URLSearchParams("tab=balances&q=old");
    expect(writeUrlFilters(EMPTY_FILTERS, base).toString()).toBe("tab=balances");
  });

  it("ignores malformed values", () => {
    const f = readUrlFilters(new URLSearchParams("sort=random&status=gone&type=SHARES,EQUAL&from=yesterday&match=x"));
    expect(f).toMatchObject({ sort: "newest", status: "active", splitType: ["EQUAL"], from: "", match: "contains" });
  });

  it("counts active filters without the text and sort", () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, q: "x", sort: "oldest" })).toBe(0);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: "x" })).toBe(true);
    expect(activeFilterCount({ ...EMPTY_FILTERS, paidBy: [A], minAmount: "1", maxAmount: "2", from: "2026-01-01", status: "edited" })).toBe(4);
  });

  it("merges parsed tokens: amounts replace each other, lists are combined", () => {
    const start = { ...EMPTY_FILTERS, paidBy: [A], amount: "500" };
    expect(mergeTokenFilters(start, { paidBy: [B, A], minAmount: "100" })).toMatchObject({ paidBy: [A, B], minAmount: "100", amount: "" });
  });

  it("sends local calendar days to the API as instants", () => {
    const p = toApiQuery({ ...EMPTY_FILTERS, from: "2026-10-01", to: "2026-10-01" }, { cursor: "c", limit: 5 });
    expect(p.get("from")).toBe(new Date(2026, 9, 1, 0, 0, 0, 0).toISOString());
    expect(p.get("to")).toBe(new Date(2026, 9, 1, 23, 59, 59, 999).toISOString());
    expect(p.get("cursor")).toBe("c");
    expect(p.get("limit")).toBe("5");
  });
});
