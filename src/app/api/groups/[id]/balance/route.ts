import { NextResponse } from "next/server";
import { requireAuth, requireGroupMember } from "@/lib/auth";
import {
  computeMemberBalances,
  simplifyDebts,
} from "@/lib/group-balances";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: true } },
      expenses: { include: { splits: true } },
      settlements: true,
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const members = group.members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
  }));

  const expenses = group.expenses.map((e) => ({
    amount: e.amount,
    paidById: e.paidById,
    splits: e.splits.map((s) => ({ userId: s.userId, amount: s.amount })),
  }));

  const settlements = group.settlements.map((s) => ({
    amount: s.amount,
    fromId: s.fromId,
    toId: s.toId,
  }));

  const totalSpend = group.expenses.reduce((sum, e) => sum + e.amount, 0);
  const balances = computeMemberBalances(members, expenses, settlements);
  const simplifiedDebts = simplifyDebts(balances);

  return NextResponse.json({
    totalSpend,
    balances,
    simplifiedDebts,
  });
}
