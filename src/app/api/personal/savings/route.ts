import { NextResponse } from "next/server";
import { requireAuth, handleZodError } from "@/lib/auth";
import { invalidateDashboard } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { savingSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const where: { userId: string; month?: number; year?: number } = {
    userId: auth.session.user.id,
  };

  if (month) {
    const m = Number(month);
    if (!Number.isNaN(m)) where.month = m;
  }
  if (year) {
    const y = Number(year);
    if (!Number.isNaN(y)) where.year = y;
  }

  const savings = await prisma.saving.findMany({
    where,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json({ savings });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const data = savingSchema.parse(body);

    const saving = await prisma.saving.upsert({
      where: {
        userId_month_year: {
          userId: auth.session.user.id,
          month: data.month,
          year: data.year,
        },
      },
      create: {
        ...data,
        userId: auth.session.user.id,
      },
      update: {
        amount: data.amount,
        notes: data.notes,
      },
    });

    invalidateDashboard(auth.session.user.id);
    return NextResponse.json({ saving }, { status: 201 });
  } catch (error) {
    return handleZodError(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing saving id" }, { status: 400 });
  }

  const existing = await prisma.saving.findFirst({
    where: { id, userId: auth.session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Saving not found" }, { status: 404 });
  }

  await prisma.saving.delete({ where: { id } });

  invalidateDashboard(auth.session.user.id);
  return NextResponse.json({ message: "Saving deleted" });
}
