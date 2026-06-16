import { endOfMonth, startOfMonth } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleZodError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORIES, EXPENSE_TYPES } from "@/lib/constants";
import { expenseSchema } from "@/lib/validators";

function parseMonthYearFilters(searchParams: URLSearchParams) {
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const category = searchParams.get("category");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};

  if (month && year) {
    const m = Number(month);
    const y = Number(year);
    if (!Number.isNaN(m) && !Number.isNaN(y) && m >= 1 && m <= 12) {
      const start = startOfMonth(new Date(y, m - 1, 1));
      const end = endOfMonth(start);
      where.date = { gte: start, lte: end };
    }
  }

  if (category && EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])) {
    where.category = category;
  }

  if (type && EXPENSE_TYPES.includes(type as (typeof EXPENSE_TYPES)[number])) {
    where.type = type;
  }

  return where;
}

const updateExpenseSchema = expenseSchema.extend({
  id: z.string().uuid(),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const filters = parseMonthYearFilters(searchParams);

  const expenses = await prisma.personalExpense.findMany({
    where: { userId: auth.session.user.id, ...filters },
    orderBy: { date: "desc" },
  });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({ expenses, total });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const data = expenseSchema.parse(body);

    const expense = await prisma.personalExpense.create({
      data: {
        ...data,
        userId: auth.session.user.id,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    return handleZodError(error);
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, ...data } = updateExpenseSchema.parse(body);

    const existing = await prisma.personalExpense.findFirst({
      where: { id, userId: auth.session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const expense = await prisma.personalExpense.update({
      where: { id },
      data,
    });

    return NextResponse.json({ expense });
  } catch (error) {
    return handleZodError(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing expense id" }, { status: 400 });
  }

  const existing = await prisma.personalExpense.findFirst({
    where: { id, userId: auth.session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  await prisma.personalExpense.delete({ where: { id } });

  return NextResponse.json({ message: "Expense deleted" });
}
