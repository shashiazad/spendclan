import { endOfMonth, startOfMonth } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleZodError } from "@/lib/auth";
import { invalidateDashboard } from "@/lib/cache";
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

import { basePrisma } from "@/lib/prisma";
import { updateActiveSavingsGoal } from "@/lib/savings-sync";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const data = expenseSchema.parse(body);

    const expense = await basePrisma.$transaction(async (tx) => {
      const created = await tx.personalExpense.create({
        data: {
          ...data,
          userId: auth.session.user.id,
        },
      });
      await updateActiveSavingsGoal(tx, auth.session.user.id, -data.amount);
      return created;
    });

    invalidateDashboard(auth.session.user.id);
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

    let expense;
    try {
      expense = await basePrisma.$transaction(async (tx) => {
        const existing = await tx.personalExpense.findFirst({
          where: { id, userId: auth.session.user.id },
        });

        if (!existing) {
          throw new Error("NOT_FOUND");
        }

        const delta = existing.amount - data.amount;
        const updated = await tx.personalExpense.update({
          where: { id },
          data,
        });

        await updateActiveSavingsGoal(tx, auth.session.user.id, delta);
        return updated;
      });
    } catch (txError: any) {
      if (txError.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Expense not found" }, { status: 404 });
      }
      throw txError;
    }

    invalidateDashboard(auth.session.user.id);
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

  try {
    try {
      await basePrisma.$transaction(async (tx) => {
        const existing = await tx.personalExpense.findFirst({
          where: { id, userId: auth.session.user.id },
        });

        if (!existing) {
          throw new Error("NOT_FOUND");
        }

        await tx.personalExpense.delete({ where: { id } });
        await updateActiveSavingsGoal(tx, auth.session.user.id, existing.amount);
      });
    } catch (txError: any) {
      if (txError.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Expense not found" }, { status: 404 });
      }
      throw txError;
    }

    invalidateDashboard(auth.session.user.id);
    return NextResponse.json({ message: "Expense deleted" });
  } catch (error) {
    return handleZodError(error);
  }
}
