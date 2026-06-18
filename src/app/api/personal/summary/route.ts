import { endOfMonth, startOfMonth } from "date-fns";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
  const year = Number(searchParams.get("year") ?? now.getFullYear());

  if (Number.isNaN(month) || Number.isNaN(year) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Valid month and year are required" },
      { status: 400 },
    );
  }

  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);

  // Run all queries concurrently — no redundant getMonthlyTotals call
  const [expensesByCategory, incomeBySource, manualSaving] = await Promise.all([
    prisma.personalExpense.groupBy({
      by: ["category"],
      where: {
        userId: auth.session.user.id,
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    prisma.income.groupBy({
      by: ["source"],
      where: {
        userId: auth.session.user.id,
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    prisma.saving.findUnique({
      where: {
        userId_month_year: {
          userId: auth.session.user.id,
          month,
          year,
        },
      },
    }),
  ]);

  // Compute totals from groupBy results instead of a separate query
  const income = incomeBySource.reduce((sum, s) => sum + (s._sum.amount ?? 0), 0);
  const expenses = expensesByCategory.reduce((sum, c) => sum + (c._sum.amount ?? 0), 0);

  return NextResponse.json({
    month,
    year,
    income,
    expenses,
    savings: income - expenses,
    manualSaving: manualSaving?.amount ?? null,
    expensesByCategory: expensesByCategory.map((c) => ({
      category: c.category,
      amount: c._sum.amount ?? 0,
    })),
    incomeBySource: incomeBySource.map((s) => ({
      source: s.source,
      amount: s._sum.amount ?? 0,
    })),
  });
}

