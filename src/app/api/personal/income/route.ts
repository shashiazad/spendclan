import { endOfMonth, startOfMonth } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleZodError } from "@/lib/auth";
import { invalidateDashboard } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { incomeSchema } from "@/lib/validators";

function parseMonthYearFilters(searchParams: URLSearchParams) {
  const month = searchParams.get("month");
  const year = searchParams.get("year");

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

  return where;
}

const updateIncomeSchema = incomeSchema.extend({
  id: z.string().uuid(),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const filters = parseMonthYearFilters(searchParams);

  const incomes = await prisma.income.findMany({
    where: { userId: auth.session.user.id, ...filters },
    orderBy: { date: "desc" },
  });

  const total = incomes.reduce((sum, i) => sum + i.amount, 0);

  return NextResponse.json({ incomes, total });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const data = incomeSchema.parse(body);

    const income = await prisma.income.create({
      data: {
        ...data,
        userId: auth.session.user.id,
      },
    });

    invalidateDashboard(auth.session.user.id);
    return NextResponse.json({ income }, { status: 201 });
  } catch (error) {
    return handleZodError(error);
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, ...data } = updateIncomeSchema.parse(body);

    const existing = await prisma.income.findFirst({
      where: { id, userId: auth.session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 });
    }

    const income = await prisma.income.update({
      where: { id },
      data,
    });

    invalidateDashboard(auth.session.user.id);
    return NextResponse.json({ income });
  } catch (error) {
    return handleZodError(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing income id" }, { status: 400 });
  }

  const existing = await prisma.income.findFirst({
    where: { id, userId: auth.session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Income not found" }, { status: 404 });
  }

  await prisma.income.delete({ where: { id } });

  invalidateDashboard(auth.session.user.id);
  return NextResponse.json({ message: "Income deleted" });
}
