export const DAILY_CATEGORIES = [
  "Groceries",
  "Travel",
  "Food Delivery",
  "Dining Out",
  "Medicine",
  "Consultation",
  "Misc",
] as const;

export const MONTHLY_CATEGORIES = [
  "Rent",
  "Loan EMI",
  "Credit Card Bill",
  "Family Transfer",
  "Monthly Expenses",
] as const;

export const LARGE_CATEGORIES = [
  "Land",
  "Home",
  "Electronics",
  "Vehicle",
  "Trip",
  "Misc Large",
] as const;

export const EXPENSE_CATEGORIES = [
  ...DAILY_CATEGORIES,
  ...MONTHLY_CATEGORIES,
  ...LARGE_CATEGORIES,
] as const;

export const CATEGORIES_BY_TYPE: Record<string, readonly string[]> = {
  DAILY: DAILY_CATEGORIES,
  MONTHLY: MONTHLY_CATEGORIES,
  LARGE: LARGE_CATEGORIES,
};

export const INCOME_SOURCES = [
  "Salary",
  "Freelance",
  "Business",
  "Other",
] as const;

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

export const PAYMENT_METHODS = ["CASH", "UPI", "CARD"] as const;
export const EXPENSE_TYPES = ["DAILY", "MONTHLY", "LARGE"] as const;
export const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export const SPLIT_TYPES = ["EQUAL", "PERCENTAGE", "CUSTOM"] as const;

export type Currency = (typeof CURRENCIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeSource = (typeof INCOME_SOURCES)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function formatCurrency(amount: number, currency = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  DAILY: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Daily" },
  MONTHLY: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Monthly" },
  LARGE: { bg: "bg-orange-500/10", text: "text-orange-400", label: "Large" },
};
