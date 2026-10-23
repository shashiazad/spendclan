import { describe, expect, it } from "vitest";
import { datePresetRange, looksLikeTokenStart, matchDatePreset, matchNamed, parseSearch } from "./search-tokens";

const people = [
  { id: "a", name: "Amit Shah" },
  { id: "v", name: "Varun" },
  { id: "v2", name: "Varsha Rao" },
  { id: "me", name: "Shashi" },
];
const groups = [
  { id: "g1", name: "Goa Trip" },
  { id: "g2", name: "Flat 4B" },
];
const now = new Date(2026, 9, 23, 15, 0); // 23 Oct 2026, local time
const parse = (input: string) => parseSearch(input, { people, groups, meId: "me", now });

describe("parseSearch", () => {
  it("keeps plain words as text", () => {
    expect(parse("hotel booking")).toEqual({ text: "hotel booking", filters: {} });
  });

  it("people tokens: paid, with, by — by name, first name, prefix or me", () => {
    expect(parse("paid:amit with:varun by:me").filters).toEqual({ paidBy: ["a"], involving: ["v"], addedBy: ["me"] });
    expect(parse("paid:amit,varsha").filters).toEqual({ paidBy: ["a", "v2"] });
  });

  it("an ambiguous or unknown person stays as text", () => {
    expect(parse("paid:var")).toEqual({ text: "paid:var", filters: {} }); // Varun or Varsha
    expect(parse("with:zoe")).toEqual({ text: "with:zoe", filters: {} });
  });

  it("amount comparisons", () => {
    expect(parse(">500").filters).toEqual({ minAmount: "500.01" });
    expect(parse(">=500 <=1,200").filters).toEqual({ minAmount: "500", maxAmount: "1200" });
    expect(parse("<100").filters).toEqual({ maxAmount: "99.99" });
    expect(parse("=₹1,200.50").filters).toEqual({ amount: "1200.50", approx: false });
    expect(parse("~500").filters).toEqual({ amount: "500", approx: true });
    expect(parse("amount:100-250").filters).toEqual({ minAmount: "100", maxAmount: "250" });
  });

  it("bad amounts stay as text", () => {
    expect(parse(">abc").text).toBe(">abc");
    expect(parse("amount:500-100").text).toBe("amount:500-100");
    expect(parse("<0").text).toBe("<0");
  });

  it("dates: month, day, year, ranges and presets", () => {
    expect(parse("date:2026-10").filters).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(parse("date:2026-02-14").filters).toEqual({ from: "2026-02-14", to: "2026-02-14" });
    expect(parse("date:2025").filters).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    expect(parse("date:2026-10-01..2026-10-05").filters).toEqual({ from: "2026-10-01", to: "2026-10-05" });
    expect(parse("date:last30").filters).toEqual({ from: "2026-09-24", to: "2026-10-23" });
    expect(parse("date:2026-02-30").text).toBe("date:2026-02-30");
  });

  it("split type, status and group", () => {
    expect(parse("type:exact type:percent").filters).toEqual({ splitType: ["CUSTOM", "PERCENTAGE"] });
    expect(parse("is:edited group:goa").filters).toEqual({ status: "edited", groupId: ["g1"] });
    expect(parse("type:itemized").text).toBe("type:itemized");
  });

  it("quoted phrases are always text, even if they look like tokens", () => {
    expect(parse('"paid:amit" "team dinner" >100')).toEqual({ text: "paid:amit team dinner", filters: { minAmount: "100.01" } });
  });

  it("mixes text and tokens in any order", () => {
    expect(parse("dinner paid:me >1000 goa")).toEqual({ text: "dinner goa", filters: { paidBy: ["me"], minAmount: "1000.01" } });
  });
});

describe("matchNamed", () => {
  it("prefers an exact name over a prefix", () => {
    expect(matchNamed("varun", people)?.id).toBe("v");
    expect(matchNamed("Varsha Rao", people)?.id).toBe("v2");
    expect(matchNamed("", people)).toBeNull();
  });
});

describe("date presets", () => {
  it("computes local calendar ranges", () => {
    expect(datePresetRange("today", now)).toEqual({ from: "2026-10-23", to: "2026-10-23" });
    expect(datePresetRange("last7", now)).toEqual({ from: "2026-10-17", to: "2026-10-23" });
    expect(datePresetRange("lastmonth", now)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(datePresetRange("thisyear", now)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });

  it("recognises a range that is a preset", () => {
    expect(matchDatePreset("2026-10-01", "2026-10-31", now)).toBe("thismonth");
    expect(matchDatePreset("2026-10-02", "2026-10-31", now)).toBeNull();
  });
});

describe("looksLikeTokenStart", () => {
  it.each(["paid:", "paid:am", ">", ">=5", "~", "date:20"])("%s is a token in progress", (w) => expect(looksLikeTokenStart(w)).toBe(true));
  it.each(["hotel", "12", ""])("%s is not", (w) => expect(looksLikeTokenStart(w)).toBe(false));
});

describe("ratio split tokens", () => {
  it("type:ratio, type:shares and type:parts all mean RATIO", () => {
    for (const t of ["type:ratio", "type:shares", "type:parts"]) {
      expect(parseSearch(t, { people: [] }).filters).toEqual({ splitType: ["RATIO"] });
    }
  });
});
