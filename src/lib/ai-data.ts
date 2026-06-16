import { prisma } from "./prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { computeMemberBalances } from "./group-balances";

export type AIFinancialContext = {
  currency: string;
  currentMonth: string;
  monthlyData: {
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }[];
  categoryBreakdown: { category: string; amount: number; type: string }[];
  typeBreakdown: { daily: number; monthly: number; large: number };
  recurringExpenses: { category: string; amount: number; frequency: string }[];
  savingsRate: number;
  groupBalances: { groupName: string; balance: number }[];
  topCategories: { category: string; total: number; avgPerMonth: number }[];
};

export async function getAIContext(userId: string): Promise<AIFinancialContext> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  const currency = user?.currency ?? "INR";

  // Last 3 months of data
  const monthlyData = [];
  for (let i = 2; i >= 0; i--) {
    const d = subMonths(now, i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);

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

    monthlyData.push({
      month: format(d, "MMMM yyyy"),
      income,
      expenses,
      savings: income - expenses,
    });
  }

  // Current month category breakdown
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const categoryExpenses = await prisma.personalExpense.groupBy({
    by: ["category", "type"],
    where: { userId, date: { gte: monthStart, lte: monthEnd } },
    _sum: { amount: true },
  });

  const categoryBreakdown = categoryExpenses.map((c) => ({
    category: c.category,
    amount: c._sum.amount ?? 0,
    type: c.type,
  }));

  // Type breakdown
  const typeBreakdown = { daily: 0, monthly: 0, large: 0 };
  for (const c of categoryBreakdown) {
    if (c.type === "DAILY") typeBreakdown.daily += c.amount;
    else if (c.type === "MONTHLY") typeBreakdown.monthly += c.amount;
    else if (c.type === "LARGE") typeBreakdown.large += c.amount;
  }

  // Recurring expenses
  const recurring = await prisma.recurringExpense.findMany({
    where: { userId, isActive: true },
    select: { category: true, amount: true, frequency: true },
  });

  // Savings rate
  const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
  const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Group balances
  const groups = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          expenses: { include: { splits: true } },
          settlements: true,
        },
      },
    },
  });

  const groupBalances = groups.map((membership) => {
    const group = membership.group;
    const members = group.members.map((m) => ({ userId: m.userId, name: m.user.name }));
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
    return { groupName: group.name, balance: myBalance };
  });

  // Top categories across 3 months
  const threeMonthsAgo = subMonths(now, 3);
  const topCats = await prisma.personalExpense.groupBy({
    by: ["category"],
    where: { userId, date: { gte: threeMonthsAgo, lte: monthEnd } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 5,
  });

  const topCategories = topCats.map((c) => ({
    category: c.category,
    total: c._sum.amount ?? 0,
    avgPerMonth: ((c._sum.amount ?? 0) / 3),
  }));

  return {
    currency,
    currentMonth: format(now, "MMMM yyyy"),
    monthlyData,
    categoryBreakdown,
    typeBreakdown,
    recurringExpenses: recurring.map((r) => ({
      category: r.category,
      amount: r.amount,
      frequency: r.frequency,
    })),
    savingsRate: Math.round(savingsRate * 100) / 100,
    groupBalances,
    topCategories,
  };
}
