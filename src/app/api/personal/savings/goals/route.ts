import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleZodError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savingsGoalSchema } from "@/lib/validators";

const updateGoalSchema = savingsGoalSchema.extend({
  id: z.string().uuid(),
});

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: auth.session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const data = savingsGoalSchema.parse(body);

    const goal = await prisma.savingsGoal.create({
      data: {
        name: data.name,
        targetAmount: data.targetAmount,
        deadline: data.deadline,
        currentAmount: 0,
        userId: auth.session.user.id,
      },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return handleZodError(error);
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, name, targetAmount, deadline } = updateGoalSchema.parse(body);

    const existing = await prisma.savingsGoal.findFirst({
      where: { id, userId: auth.session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        name,
        targetAmount,
        deadline,
      },
    });

    return NextResponse.json({ goal });
  } catch (error) {
    return handleZodError(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing goal id" }, { status: 400 });
  }

  const existing = await prisma.savingsGoal.findFirst({
    where: { id, userId: auth.session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  await prisma.savingsGoal.delete({ where: { id } });

  return NextResponse.json({ message: "Goal deleted" });
}
