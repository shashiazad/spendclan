import { NextResponse } from "next/server";
import type { SplitType } from "@prisma/client";
import {
  requireAuth,
  requireGroupMember,
  handleZodError,
} from "@/lib/auth";

import { invalidateGroupMemberDashboards } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { groupExpenseSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

function computeSplits(
  splitType: SplitType,
  amount: number,
  memberIds: string[],
  paidById: string,
  splits?: { userId: string; amount: number; percentage?: number }[],
): { splits: { userId: string; amount: number }[] } | { error: string } {
  const totalCents = Math.round(amount * 100);

  if (splitType === "EQUAL") {
    const n = memberIds.length;
    if (n === 0) return { error: "No members in group" };

    const baseCents = Math.floor(totalCents / n);
    const remainderCents = totalCents - baseCents * n;

    const computed = memberIds.map((userId) => {
      const isPayer = userId === paidById;
      const shareCents = baseCents + (isPayer ? remainderCents : 0);
      return {
        userId,
        amount: shareCents / 100,
      };
    });

    return { splits: computed };
  }

  if (!splits?.length) {
    return { error: "Splits are required for PERCENTAGE and CUSTOM split types" };
  }

  for (const split of splits) {
    if (!memberIds.includes(split.userId)) {
      return { error: "All split users must be group members" };
    }
  }

  const splitUserIds = new Set(splits.map((s) => s.userId));
  if (splitUserIds.size !== memberIds.length) {
    return { error: "Splits must include all group members" };
  }

  if (splitType === "PERCENTAGE") {
    const hasPercentages = splits.some((s) => s.percentage !== undefined);

    if (hasPercentages) {
      const totalPercentCents = splits.reduce(
        (sum, s) => sum + Math.round((s.percentage ?? 0) * 100),
        0,
      );
      if (totalPercentCents !== 10000) {
        return { error: "Percentage splits must sum to exactly 100.00%" };
      }

      let sumSharesCents = 0;
      for (const s of splits) {
        const pct = s.percentage ?? 0;
        const expectedCents = Math.round((pct / 100) * totalCents);
        const actualCents = Math.round(s.amount * 100);

        if (Math.abs(actualCents - expectedCents) > 1) {
          const expectedVal = (expectedCents / 100).toFixed(2);
          return {
            error: `Split share for user ${s.userId} ($${s.amount.toFixed(
              2,
            )}) does not match calculated share from percentage ${pct}% ($${expectedVal})`,
          };
        }
        sumSharesCents += actualCents;
      }

      if (sumSharesCents !== totalCents) {
        const expected = amount.toFixed(2);
        const actual = (sumSharesCents / 100).toFixed(2);
        return {
          error: `Percentage split shares sum ($${actual}) must equal the total expense amount ($${expected}) exactly`,
        };
      }

      return { splits: splits.map(({ userId, amount }) => ({ userId, amount })) };
    } else {
      const totalPercentCents = splits.reduce(
        (sum, s) => sum + Math.round(s.amount * 100),
        0,
      );
      if (totalPercentCents !== 10000) {
        return { error: "Percentage splits must sum to exactly 100.00%" };
      }

      let computedCentsSum = 0;
      const computed = splits.map((s) => {
        const shareCents = Math.round((s.amount / 100) * totalCents);
        computedCentsSum += shareCents;
        return {
          userId: s.userId,
          amount: shareCents / 100,
          cents: shareCents,
        };
      });

      const remainderCents = totalCents - computedCentsSum;
      if (remainderCents !== 0 && computed.length > 0) {
        const payerSplit = computed.find((c) => c.userId === paidById);
        const target = payerSplit || computed[0];
        target.cents += remainderCents;
        target.amount = target.cents / 100;
      }

      return { splits: computed.map(({ userId, amount }) => ({ userId, amount })) };
    }
  }

  if (splitType === "CUSTOM") {
    const sumCents = splits.reduce((sum, s) => sum + Math.round(s.amount * 100), 0);
    if (sumCents !== totalCents) {
      const expected = amount.toFixed(2);
      const actual = (sumCents / 100).toFixed(2);
      return {
        error: `Custom splits sum ($${actual}) must equal the total expense amount ($${expected}) exactly`,
      };
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
      data.paidById,
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
