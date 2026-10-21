import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireGroupMember, handleZodError } from "@/lib/auth";
import { invalidateGroupMemberDashboards } from "@/lib/cache";
import { EXPENSE_FORBIDDEN_MESSAGE, canModifyExpense } from "@/lib/group-permissions";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const restoreSchema = z.object({ id: z.string().uuid() });

/** Restores a soft-deleted expense (used by "Undo" after a delete). */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  try {
    const { id } = restoreSchema.parse(await request.json());

    const expense = await prisma.groupExpense.findFirst({
      where: { id, groupId, deletedAt: { not: null } },
    });
    if (!expense) {
      return NextResponse.json({ error: "Deleted expense not found" }, { status: 404 });
    }
    if (!canModifyExpense(expense, auth.session.user.id)) {
      return NextResponse.json({ error: EXPENSE_FORBIDDEN_MESSAGE }, { status: 403 });
    }

    await prisma.groupExpense.update({
      where: { id },
      data: { deletedAt: null, deletedById: null },
    });

    await invalidateGroupMemberDashboards(groupId);
    return NextResponse.json({ message: "Expense restored" });
  } catch (error) {
    return handleZodError(error);
  }
}
