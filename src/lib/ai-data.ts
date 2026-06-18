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
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const threeMonthsAgo = subMonths(now, 3);

  // Run ALL independent queries concurrently
  const [
    user,
    monthlyData,
    categoryExpenses,
    recurring,
    groups,
    topCats,
  ] = await Promise.all([
    // User currency
    prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    }),
    // Last 3 months of data — run all 3 concurrently (was sequential loop)
    Promise.all(
      Array.from({ length: 3 }, (_, i) => {
        const d = subMonths(now, 2 - i);
        const start = startOfMonth(d);
        const end = endOfMonth(d);

        return Promise.all([
          prisma.income.aggregate({
            where: { userId, date: { gte: start, lte: end } },
            _sum: { amount: true },
          }),
          prisma.personalExpense.aggregate({
            where: { userId, date: { gte: start, lte: end } },
            _sum: { amount: true },
          }),
        ]).then(([incomeAgg, expenseAgg]) => {
          const income = incomeAgg._sum.amount ?? 0;
          const expenses = expenseAgg._sum.amount ?? 0;
          return {
            month: format(d, "MMMM yyyy"),
            income,
            expenses,
            savings: income - expenses,
          };
        });
      })
    ),
    // Current month category breakdown
    prisma.personalExpense.groupBy({
      by: ["category", "type"],
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    // Recurring expenses
    prisma.recurringExpense.findMany({
      where: { userId, isActive: true },
      select: { category: true, amount: true, frequency: true },
    }),
    // Group balances
    prisma.groupMember.findMany({
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
    }),
    // Top categories across 3 months
    prisma.personalExpense.groupBy({
      by: ["category"],
      where: { userId, date: { gte: threeMonthsAgo, lte: monthEnd } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
  ]);

  const currency = user?.currency ?? "INR";

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

  // Savings rate
  const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
  const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Group balances
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

