import { NextResponse } from "next/server";
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
import { computeSplits } from "@/lib/splits";
import { listGroupExpenses } from "@/lib/group-data";
import { hasSearchParams } from "@/lib/expense-search";
import { handleSearchRequest } from "@/lib/expense-search-server";

type RouteContext = { params: Promise<{ id: string }> };

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
      // Ratio splits keep each person's parts so an edit shows the original ratio
      .map((s) => ({ userId: s.userId, amount: s.amount, ...(s.ratio !== undefined && { ratio: s.ratio }) })),
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

  return NextResponse.json({ expenses: await listGroupExpenses(groupId, auth.session.user.id) });
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
    include: { splits: { select: { userId: true, amount: true, ratio: true } } },
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
