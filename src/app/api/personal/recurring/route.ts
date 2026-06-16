import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleZodError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recurringSchema } from "@/lib/validators";

const updateRecurringSchema = recurringSchema.extend({
  id: z.string().uuid(),
});

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const recurring = await prisma.recurringExpense.findMany({
    where: { userId: auth.session.user.id },
    orderBy: { nextDueDate: "asc" },
  });

  return NextResponse.json({ recurring });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const data = recurringSchema.parse(body);

    const item = await prisma.recurringExpense.create({
      data: {
        ...data,
        isActive: data.isActive ?? true,
        userId: auth.session.user.id,
      },
    });

    return NextResponse.json({ recurring: item }, { status: 201 });
  } catch (error) {
    return handleZodError(error);
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, ...data } = updateRecurringSchema.parse(body);

    const existing = await prisma.recurringExpense.findFirst({
      where: { id, userId: auth.session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring expense not found" },
        { status: 404 },
      );
    }

    const recurring = await prisma.recurringExpense.update({
      where: { id },
      data,
    });

    return NextResponse.json({ recurring });
  } catch (error) {
    return handleZodError(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Missing recurring expense id" },
      { status: 400 },
    );
  }

  const existing = await prisma.recurringExpense.findFirst({
    where: { id, userId: auth.session.user.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Recurring expense not found" },
      { status: 404 },
    );
  }

  await prisma.recurringExpense.delete({ where: { id } });

  return NextResponse.json({ message: "Recurring expense deleted" });
}
