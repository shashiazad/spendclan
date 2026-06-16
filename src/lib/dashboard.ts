import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from "date-fns";
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
  const current = await getMonthlyTotals(userId, month, year);

  const trends = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const totals = await getMonthlyTotals(userId, m, y);
    trends.push({
      month: format(d, "MMM yyyy"),
      income: totals.income,
      expenses: totals.expenses,
      savings: totals.savings,
    });
  }

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const categoryExpenses = await prisma.personalExpense.groupBy({
    by: ["category"],
    where: { userId, date: { gte: monthStart, lte: monthEnd } },
    _sum: { amount: true },
  });

  // Type breakdown: Daily / Monthly / Large
  const typeExpenses = await prisma.personalExpense.groupBy({
    by: ["type"],
    where: { userId, date: { gte: monthStart, lte: monthEnd } },
    _sum: { amount: true },
  });

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

  const recentExpenses = await prisma.personalExpense.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 5,
  });

  const manualSaving = await prisma.saving.findFirst({
    where: { userId, month, year },
  });

  const groups = await prisma.groupMember.findMany({
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
  });

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
  const biggestExpense = await prisma.personalExpense.findFirst({
    where: { userId, date: { gte: monthStart, lte: monthEnd } },
    orderBy: { amount: "desc" },
  });

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
