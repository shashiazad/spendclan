export const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;

export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "In what city were you born?",
  "What was the name of your first school?",
  "What is your favorite book?",
  "What was your childhood nickname?",
  "What street did you grow up on?",
  "What was your first car?",
] as const;

export const SPLIT_TYPES = ["EQUAL", "PERCENTAGE", "CUSTOM", "RATIO"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

// One fixed locale per currency, so the server, Chrome and Safari all print the same thing
// (₹ uses Indian digit grouping: ₹1,02,815.50) and negatives read "-₹298.50", not "₹-298.50".
const CURRENCY_LOCALES: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};
const formatters = new Map<string, Intl.NumberFormat>();

export function formatCurrency(amount: number, currency = "INR") {
  let fmt = formatters.get(currency);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat(CURRENCY_LOCALES[currency] ?? "en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      // Unknown currency code: symbol (or code) + grouped number
      const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
      const plain = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${amount < 0 ? "-" : ""}${symbol}${plain.format(Math.abs(amount))}`;
    }
    formatters.set(currency, fmt);
  }
  // Avoid "-₹0.00" for tiny negative float leftovers
  const value = Math.abs(amount) < 0.005 ? 0 : amount;
  return fmt.format(value);
}
