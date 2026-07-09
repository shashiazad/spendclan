import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const monthStr = searchParams.get("month");
  const yearStr = searchParams.get("year");

  const now = new Date();
  const month = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1;
  const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();

  if (isNaN(month) || month < 1 || month > 12 || isNaN(year)) {
    return NextResponse.json({ error: "Invalid month or year parameters" }, { status: 400 });
  }

  // Calculate start and end date for the selected month in UTC/Local bounds
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)); // Start of next month (exclusive)

  try {
    const userId = auth.session.user.id;

    // Fetch personal expenses
    const expenses = await prisma.personalExpense.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    // Fetch incomes
    const incomes = await prisma.income.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    // Fetch savings
    const savings = await prisma.saving.findMany({
      where: {
        userId,
        month,
        year,
      },
      orderBy: { createdAt: "asc" },
    });

    // Compute Summaries
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalSavings = savings.reduce((sum, s) => sum + s.amount, 0);

    // Compute Category breakdown
    const categoryMap = new Map<string, number>();
    for (const exp of expenses) {
      categoryMap.set(exp.category, (categoryMap.get(exp.category) ?? 0) + exp.amount);
    }
    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 10000) / 100 : 0,
    })).sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      month,
      year,
      summary: {
        totalExpenses,
        totalIncome,
        totalSavings,
        netRemaining: totalIncome - totalExpenses - totalSavings,
      },
      expenses,
      incomes,
      savings,
      categoryBreakdown,
    });
  } catch (error) {
    console.error("Failed to generate report data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
