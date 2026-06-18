import { NextResponse } from "next/server";
import type { SplitType } from "@prisma/client";
import {
  requireAuth,
  requireGroupMember,
  handleZodError,
} from "@/lib/auth";
import { buildEqualSplits } from "@/lib/group-balances";
import { invalidateGroupMemberDashboards } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { groupExpenseSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

function computeSplits(
  splitType: SplitType,
  amount: number,
  memberIds: string[],
  splits?: { userId: string; amount: number }[],
): { splits: { userId: string; amount: number }[] } | { error: string } {
  if (splitType === "EQUAL") {
    return { splits: buildEqualSplits(memberIds, amount) };
  }

  if (!splits?.length) {
    return { error: "Splits are required for PERCENTAGE and CUSTOM split types" };
  }

  for (const split of splits) {
    if (!memberIds.includes(split.userId)) {
      return { error: "All split users must be group members" };
    }
  }

  if (splitType === "PERCENTAGE") {
    const totalPercent = splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      return { error: "Percentage splits must sum to 100%" };
    }

    const computed = splits.map((s) => ({
      userId: s.userId,
      amount: Math.round((amount * s.amount) / 100 * 100) / 100,
    }));

    const splitTotal = computed.reduce((sum, s) => sum + s.amount, 0);
    const remainder = Math.round((amount - splitTotal) * 100) / 100;
    if (remainder !== 0 && computed.length > 0) {
      computed[0].amount =
        Math.round((computed[0].amount + remainder) * 100) / 100;
    }

    return { splits: computed };
  }

  if (splitType === "CUSTOM") {
    const total = splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(total - amount) > 0.01) {
      return { error: "Custom splits must sum to the expense amount" };
    }
    return { splits };
  }

  return { error: "Invalid split type" };
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  const expenses = await prisma.groupExpense.findMany({
    where: { groupId },
    include: {
      paidBy: { select: { id: true, name: true } },
      splits: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ expenses });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  try {
    const body = await request.json();
    const data = groupExpenseSchema.parse(body);

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);

    if (!memberIds.includes(data.paidById)) {
      return NextResponse.json(
        { error: "Payer must be a group member" },
        { status: 400 },
      );
    }

    const splitResult = computeSplits(
      data.splitType,
      data.amount,
      memberIds,
      data.splits,
    );

    if ("error" in splitResult) {
      return NextResponse.json({ error: splitResult.error }, { status: 400 });
    }

    const expense = await prisma.groupExpense.create({
      data: {
        amount: data.amount,
        description: data.description,
        date: data.date,
        splitType: data.splitType,
        paidById: data.paidById,
        groupId,
        splits: {
          create: splitResult.splits.map((s) => ({
            userId: s.userId,
            amount: s.amount,
          })),
        },
      },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    await invalidateGroupMemberDashboards(groupId);
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    return handleZodError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  const expenseId = new URL(request.url).searchParams.get("id");
  if (!expenseId) {
    return NextResponse.json({ error: "Missing expense id" }, { status: 400 });
  }

  const expense = await prisma.groupExpense.findFirst({
    where: { id: expenseId, groupId },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  await prisma.groupExpense.delete({ where: { id: expenseId } });

  await invalidateGroupMemberDashboards(groupId);
  return NextResponse.json({ message: "Expense deleted" });
}
