import { describe, expect, it } from "vitest";
import { computeSplits } from "./splits";
import { buildEqualSplits, computeMemberBalances, simplifyDebts } from "./group-balances";

const [A, B, C, D] = ["a", "b", "c", "d"];
const members = [A, B, C];
const ok = (r: ReturnType<typeof computeSplits>) => {
  if ("error" in r) throw new Error(r.error);
  return Object.fromEntries(r.splits.map((s) => [s.userId, s.amount]));
};
const err = (r: ReturnType<typeof computeSplits>) => ("error" in r ? r.error : null);

describe("computeSplits: equal", () => {
  it("splits evenly in paise and gives the leftover to the payer", () => {
    expect(ok(computeSplits("EQUAL", 100, members, B))).toEqual({ a: 33.33, b: 33.34, c: 33.33 });
  });

  it("gives the leftover to the first participant when the payer isn't in the split", () => {
    expect(ok(computeSplits("EQUAL", 10, members, C, undefined, [A, B]))).toEqual({ a: 5, b: 5 });
    expect(ok(computeSplits("EQUAL", 0.05, members, C, undefined, [A, B]))).toEqual({ a: 0.03, b: 0.02 });
  });

  it("always adds up to the total", () => {
    for (const total of [0.01, 1, 99.99, 1234.57, 100000]) {
      const shares = Object.values(ok(computeSplits("EQUAL", total, members, A)));
      expect(Math.round(shares.reduce((s, x) => s + x, 0) * 100)).toBe(Math.round(total * 100));
    }
  });

  it("rejects nobody, duplicates and outsiders", () => {
    expect(err(computeSplits("EQUAL", 10, members, A, undefined, []))).toMatch(/at least one/);
    expect(err(computeSplits("EQUAL", 10, members, A, undefined, [A, A]))).toMatch(/only appear once/);
    expect(err(computeSplits("EQUAL", 10, members, A, undefined, [A, D]))).toMatch(/group members/);
  });

  it("allows someone who left only when they're already on the expense", () => {
    expect(ok(computeSplits("EQUAL", 10, members, A, undefined, [A, D], [D]))).toEqual({ a: 5, d: 5 });
  });
});

describe("computeSplits: exact amounts", () => {
  it("accepts shares that add up exactly", () => {
    const splits = [{ userId: A, amount: 70 }, { userId: B, amount: 30 }];
    expect(ok(computeSplits("CUSTOM", 100, members, A, splits))).toEqual({ a: 70, b: 30 });
  });

  it("rejects shares that don't, with a currency-neutral message", () => {
    const e = err(computeSplits("CUSTOM", 100, members, A, [{ userId: A, amount: 70 }]));
    expect(e).toBe("Custom splits sum (70.00) must equal the total expense amount (100.00) exactly");
  });
});

describe("computeSplits: percentages", () => {
  it("converts percentages and gives rounding to the payer", () => {
    const splits = [
      { userId: A, amount: 33.33 },
      { userId: B, amount: 33.33 },
      { userId: C, amount: 33.34 },
    ];
    const r = ok(computeSplits("PERCENTAGE", 10, members, B, splits));
    expect(Math.round((r.a + r.b + r.c) * 100)).toBe(1000);
  });

  it("rejects percentages that don't total 100%", () => {
    const splits = [{ userId: A, amount: 50 }, { userId: B, amount: 40 }];
    expect(err(computeSplits("PERCENTAGE", 10, members, A, splits))).toMatch(/100.00%/);
  });
});

describe("balances and settling up", () => {
  const people = members.map((id) => ({ userId: id, name: id.toUpperCase() }));

  it("payer is owed what others' shares add up to; settlements move it back", () => {
    const expenses = [{ amount: 1200, paidById: B, splits: buildEqualSplits(members, 1200) }];
    expect(computeMemberBalances(people, expenses, []).map((b) => b.balance)).toEqual([-400, 800, -400]);
    const after = computeMemberBalances(people, expenses, [{ amount: 400, fromId: A, toId: B }]);
    expect(after.map((b) => b.balance)).toEqual([0, 400, -400]);
  });

  it("balances always sum to zero", () => {
    const expenses = [
      { amount: 100, paidById: A, splits: buildEqualSplits(members, 100) },
      { amount: 55.55, paidById: C, splits: buildEqualSplits([A, C], 55.55) },
    ];
    const sum = computeMemberBalances(people, expenses, []).reduce((s, b) => s + b.balance, 0);
    expect(Math.abs(sum)).toBeLessThan(0.011);
  });

  it("simplifies to the fewest payments", () => {
    const debts = simplifyDebts([
      { userId: A, name: "A", balance: -50 },
      { userId: B, name: "B", balance: -50 },
      { userId: C, name: "C", balance: 100 },
    ]);
    expect(debts).toEqual([
      { fromId: A, fromName: "A", toId: C, toName: "C", amount: 50 },
      { fromId: B, fromName: "B", toId: C, toName: "C", amount: 50 },
    ]);
    expect(simplifyDebts([{ userId: A, name: "A", balance: 0.004 }])).toEqual([]);
  });
});
