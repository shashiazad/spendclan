import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from "date-fns";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { computeMemberBalances } from "./group-balances";

export async function getMonthlyTotals(userId: string, month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = endOfMonth(start);

  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.income.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.personalExpense.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ]);

  const income = incomeAgg._sum.amount ?? 0;
  const expenses = expenseAgg._sum.amount ?? 0;

  return { income, expenses, savings: income - expenses };
}

export async function getDashboardData(userId: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Run ALL independent queries concurrently instead of sequentially
  const [
    trends,
    categoryExpenses,
    typeExpenses,
    recentExpenses,
    manualSaving,
    groups,
    biggestExpense,
  ] = await Promise.all([
    // Trends: run all 6 months concurrently (was sequential — 12 queries in a loop)
    Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(now, 5 - i);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        return getMonthlyTotals(userId, m, y).then((totals) => ({
          month: format(d, "MMM yyyy"),
          income: totals.income,
          expenses: totals.expenses,
          savings: totals.savings,
        }));
      })
    ),
    // Category breakdown
    prisma.personalExpense.groupBy({
      by: ["category"],
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    // Type breakdown
    prisma.personalExpense.groupBy({
      by: ["type"],
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    // Recent expenses
    prisma.personalExpense.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
    }),
    // Manual saving
    prisma.saving.findFirst({
      where: { userId, month, year },
    }),
    // Groups with balances
    prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: { include: { user: true } },
            expenses: { include: { splits: true } },
            settlements: true,
          },
        },
      },
    }),
    // Biggest expense this month
    prisma.personalExpense.findFirst({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      orderBy: { amount: "desc" },
    }),
  ]);

  // Current month totals from trends (last element is the current month)
  const current = trends[trends.length - 1];

  // Type breakdown
  const typeBreakdown = {
    daily: 0,
    monthly: 0,
    large: 0,
  };
  for (const te of typeExpenses) {
    if (te.type === "DAILY") typeBreakdown.daily = te._sum.amount ?? 0;
    else if (te.type === "MONTHLY") typeBreakdown.monthly = te._sum.amount ?? 0;
    else if (te.type === "LARGE") typeBreakdown.large = te._sum.amount ?? 0;
  }

  // Group balances
  let othersOweYou = 0;
  let youOwe = 0;

  for (const membership of groups) {
    const group = membership.group;
    const members = group.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
    }));
    const expenses = group.expenses.map((e) => ({
      amount: e.amount,
      paidById: e.paidById,
      splits: e.splits.map((s) => ({ userId: s.userId, amount: s.amount })),
    }));
    const settlements = group.settlements.map((s) => ({
      amount: s.amount,
      fromId: s.fromId,
      toId: s.toId,
    }));

    const balances = computeMemberBalances(members, expenses, settlements);
    const myBalance = balances.find((b) => b.userId === userId)?.balance ?? 0;
    if (myBalance > 0) othersOweYou += myBalance;
    if (myBalance < 0) youOwe += Math.abs(myBalance);
  }

  const personalSavings = manualSaving?.amount ?? current.savings;
  const remaining = current.income - current.expenses;
  const netWorth = personalSavings + othersOweYou - youOwe;

  // Quick stats
  const daysInMonth = now.getDate();
  const avgDailySpend = daysInMonth > 0 ? current.expenses / daysInMonth : 0;
  const topCategory = categoryExpenses.length > 0
    ? categoryExpenses.reduce((a, b) => ((a._sum.amount ?? 0) > (b._sum.amount ?? 0) ? a : b)).category
    : null;

  return {
    summary: {
      totalIncome: current.income,
      totalExpenses: current.expenses,
      savings: personalSavings,
      netWorth,
      othersOweYou,
      youOwe,
      remaining,
    },
    typeBreakdown,
    quickStats: {
      avgDailySpend: Math.round(avgDailySpend * 100) / 100,
      topCategory,
      biggestExpense: biggestExpense ? { amount: biggestExpense.amount, category: biggestExpense.category } : null,
    },
    trends,
    categoryBreakdown: categoryExpenses.map((c) => ({
      category: c.category,
      amount: c._sum.amount ?? 0,
    })),
    recentExpenses,
  };
}

/**
 * Cached version of getDashboardData.
 * Uses Next.js unstable_cache with tag-based invalidation.
 * The cache is invalidated when expenses, income, savings, or group data changes.
 */
export function getCachedDashboardData(userId: string) {
  return unstable_cache(
    () => getDashboardData(userId),
    [`dashboard-${userId}`],
    {
      tags: [`dashboard-${userId}`],
      revalidate: 3600, // Fallback: revalidate every hour even without explicit invalidation
    }
  )();
}
