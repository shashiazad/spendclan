import { NextResponse } from "next/server";
import type { SplitType } from "@prisma/client";
import {
  requireAuth,
  requireGroupMember,
  handleZodError,
} from "@/lib/auth";

import { invalidateGroupMemberDashboards } from "@/lib/cache";
import {
  EXPENSE_FORBIDDEN_MESSAGE,
  canModifyExpense,
} from "@/lib/group-permissions";
import { prisma } from "@/lib/prisma";
import { groupExpenseSchema } from "@/lib/validators";
import { hasSearchParams } from "@/lib/expense-search";
import { handleSearchRequest } from "@/lib/expense-search-server";

type RouteContext = { params: Promise<{ id: string }> };

function computeSplits(
  splitType: SplitType,
  amount: number,
  memberIds: string[],
  paidById: string,
  splits?: { userId: string; amount: number; percentage?: number }[],
  participantIds?: string[],
  // People who have left the group but are already on the expense being edited
  formerIds: string[] = [],
): { splits: { userId: string; amount: number }[] } | { error: string } {
  const totalCents = Math.round(amount * 100);
  const allowedIds = [...memberIds, ...formerIds];

  if (splitType === "EQUAL") {
    // Equal split among the chosen participants (everyone by default)
    const participants = participantIds ?? memberIds;
    if (participants.length === 0) return { error: "Choose at least one person to split with" };
    if (new Set(participants).size !== participants.length) {
      return { error: "Each person can only appear once in a split" };
    }
    if (participants.some((uid) => !allowedIds.includes(uid))) {
      return { error: "All split users must be group members" };
    }

    const n = participants.length;
    const baseCents = Math.floor(totalCents / n);
    const remainderCents = totalCents - baseCents * n;
    // Leftover paise go to the payer when they share the expense, otherwise to the first participant
    const remainderTo = participants.includes(paidById) ? paidById : participants[0];

    const computed = participants.map((userId) => ({
      userId,
      amount: (baseCents + (userId === remainderTo ? remainderCents : 0)) / 100,
    }));

    return { splits: computed };
  }

  if (!splits?.length) {
    return { error: "Splits are required for PERCENTAGE and CUSTOM split types" };
  }

  for (const split of splits) {
    if (!allowedIds.includes(split.userId)) {
      return { error: "All split users must be group members" };
    }
  }

  // A subset of members is allowed; each person may appear only once
  const splitUserIds = new Set(splits.map((s) => s.userId));
  if (splitUserIds.size !== splits.length) {
    return { error: "Each person can only appear once in a split" };
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

const expenseInclude = {
  paidBy: { select: { id: true, name: true } },
  splits: {
    include: {
      user: { select: { id: true, name: true } },
    },
  },
} as const;

/**
 * Validates an expense body against the group's active members and computes its splits.
 * People with a zero share are left out, so they show as "not involved".
 * When editing, `existing` lets the payer and people already on the expense stay even if
 * they have since left the group, so a small fix doesn't force rewriting the whole split.
 */
async function prepareExpense(
  groupId: string,
  body: unknown,
  existing?: { paidById: string; splits: { userId: string }[] },
) {
  const data = groupExpenseSchema.parse(body);

  const members = await prisma.groupMember.findMany({
    where: { groupId, removedAt: null },
    select: { userId: true },
  });
  const memberIds = members.map((m) => m.userId);
  const formerIds = existing
    ? [existing.paidById, ...existing.splits.map((s) => s.userId)].filter((id) => !memberIds.includes(id))
    : [];

  if (!memberIds.includes(data.paidById) && !(existing && data.paidById === existing.paidById)) {
    return { error: "Payer must be a group member" } as const;
  }

  const splitResult = computeSplits(
    data.splitType,
    data.amount,
    memberIds,
    data.paidById,
    data.splits,
    data.participantIds,
    formerIds,
  );
  if ("error" in splitResult) return { error: splitResult.error } as const;

  return {
    data,
    splits: splitResult.splits
      .filter((s) => s.amount > 0)
      .map((s) => ({ userId: s.userId, amount: s.amount })),
  } as const;
}

/**
 * GET with no query string: every active expense, newest first (`{ expenses }`), as before.
 * GET with search params (q, amount, paidBy, from, sort, cursor, …): one page of matching
 * expenses (`{ items, nextCursor, totalCount, totalAmountMinor }`). See lib/expense-search.ts.
 */
export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  if (hasSearchParams(new URL(request.url).searchParams)) {
    // This endpoint only ever searches its own group, whatever groupId filter is passed
    return handleSearchRequest(request, auth.session.user.id, () => [groupId]);
  }

  const expenses = await prisma.groupExpense.findMany({
    where: { groupId, deletedAt: null },
    include: expenseInclude,
    orderBy: { date: "desc" },
  });

  const userId = auth.session.user.id;
  return NextResponse.json({
    expenses: expenses.map((e) => ({ ...e, canEdit: canModifyExpense(e, userId) })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  try {
    const prepared = await prepareExpense(groupId, await request.json());
    if ("error" in prepared) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }
    const { data, splits } = prepared;

    const expense = await prisma.groupExpense.create({
      data: {
        amount: data.amount,
        description: data.description,
        date: data.date,
        splitType: data.splitType,
        paidById: data.paidById,
        groupId,
        createdById: auth.session.user.id,
        splits: { create: splits },
      },
      include: expenseInclude,
    });

    await invalidateGroupMemberDashboards(groupId);
    return NextResponse.json({ expense: { ...expense, canEdit: true } }, { status: 201 });
  } catch (error) {
    return handleZodError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;
  const userId = auth.session.user.id;

  const memberCheck = await requireGroupMember(groupId, userId);
  if ("error" in memberCheck) return memberCheck.error;

  const expenseId = new URL(request.url).searchParams.get("id");
  if (!expenseId) {
    return NextResponse.json({ error: "Missing expense id" }, { status: 400 });
  }

  const existing = await prisma.groupExpense.findFirst({
    where: { id: expenseId, groupId, deletedAt: null },
    include: { splits: { select: { userId: true, amount: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  if (!canModifyExpense(existing, userId)) {
    return NextResponse.json({ error: EXPENSE_FORBIDDEN_MESSAGE }, { status: 403 });
  }

  try {
    const prepared = await prepareExpense(groupId, await request.json(), existing);
    if ("error" in prepared) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }
    const { data, splits } = prepared;

    const expense = await prisma.$transaction(async (tx) => {
      // Keep the previous version: snapshot first, then replace the splits
      await tx.groupExpenseRevision.create({
        data: {
          groupExpenseId: existing.id,
          editedById: userId,
          snapshot: {
            amount: existing.amount,
            description: existing.description,
            date: existing.date.toISOString(),
            splitType: existing.splitType,
            paidById: existing.paidById,
            splits: existing.splits,
          },
        },
      });
      await tx.groupSplit.deleteMany({ where: { groupExpenseId: existing.id } });
      return tx.groupExpense.update({
        where: { id: existing.id },
        data: {
          amount: data.amount,
          description: data.description,
          date: data.date,
          splitType: data.splitType,
          paidById: data.paidById,
          updatedById: userId,
          splits: { create: splits },
        },
        include: expenseInclude,
      });
    });

    await invalidateGroupMemberDashboards(groupId);
    return NextResponse.json({ expense: { ...expense, canEdit: true } });
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
    where: { id: expenseId, groupId, deletedAt: null },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  if (!canModifyExpense(expense, auth.session.user.id)) {
    return NextResponse.json({ error: EXPENSE_FORBIDDEN_MESSAGE }, { status: 403 });
  }

  // Soft delete: the expense and its splits are kept for history and audit
  await prisma.groupExpense.update({
    where: { id: expenseId },
    data: { deletedAt: new Date(), deletedById: auth.session.user.id },
  });

  await invalidateGroupMemberDashboards(groupId);
  return NextResponse.json({ message: "Expense deleted" });
}
