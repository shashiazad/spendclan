import { describe, expect, it } from "vitest";
import { formatCurrency } from "./constants";

describe("formatCurrency", () => {
  it("puts the minus sign before the symbol", () => {
    expect(formatCurrency(-298.5)).toBe("-₹298.50");
    expect(formatCurrency(-1028.15, "INR")).toBe("-₹1,028.15");
  });

  it("uses Indian digit grouping for rupees and western grouping elsewhere", () => {
    expect(formatCurrency(102815.5, "INR")).toBe("₹1,02,815.50");
    expect(formatCurrency(102815.5, "USD")).toBe("$102,815.50");
    expect(formatCurrency(102815.5, "GBP")).toBe("£102,815.50");
    expect(formatCurrency(1234.5, "EUR")).toBe("€1,234.50");
  });

  it("always shows two decimals and never prints -0.00", () => {
    expect(formatCurrency(1200)).toBe("₹1,200.00");
    expect(formatCurrency(-0.001)).toBe("₹0.00");
    expect(formatCurrency(0.1 + 0.2)).toBe("₹0.30");
  });

  it("falls back for an unknown currency code", () => {
    expect(formatCurrency(-5, "XYZ")).toMatch(/^-XYZ\s?5\.00$/);
  });
});
