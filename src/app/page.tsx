import type { Metadata } from "next";
import { HomePageClient } from "@/components/HomePageClient";

export const metadata: Metadata = {
  title: "SpendClan — Premium Expense Tracker & Smart Group Splits",
  description:
    "Manage your personal finances and split group expenses effortlessly. Track income, expenses, savings goals, and settle debts with friends — all in one premium, high-contrast, privacy-first platform.",
  keywords: [
    "expense tracker",
    "group splits",
    "personal finance",
    "bill splitting",
    "savings goals",
    "budget manager",
  ],
};

export default function HomePage() {
  return <HomePageClient />;
}
