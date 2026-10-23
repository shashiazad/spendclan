import { prisma } from "./prisma";
import { computeMemberBalances, simplifyDebts } from "./group-balances";
import { canModifyExpense } from "./group-permissions";

/**
 * Read models for one group, shared by the group API routes and the server-rendered group page.
 * Callers check membership first.
 */

export async function getGroupDetail(groupId: string) {
  return prisma.group.findUnique({
    where: { id: groupId, deletedAt: null },
    include: {
      members: {
        where: { removedAt: null },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

export const groupExpenseInclude = {
  paidBy: { select: { id: true, name: true } },
  splits: { include: { user: { select: { id: true, name: true } } } },
} as const;

/** Every active expense, newest first, with whether the viewer may edit it. */
export async function listGroupExpenses(groupId: string, userId: string) {
  const expenses = await prisma.groupExpense.findMany({
    where: { groupId, deletedAt: null },
    include: groupExpenseInclude,
    orderBy: { date: "desc" },
  });
  return expenses.map((e) => ({ ...e, canEdit: canModifyExpense(e, userId) }));
}

export async function getGroupBalance(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: true } },
      expenses: { where: { deletedAt: null }, include: { splits: true } },
      settlements: { where: { deletedAt: null } },
    },
  });
  if (!group) return null;
  const balances = computeMemberBalances(
    group.members.map((m) => ({ userId: m.userId, name: m.user.name })),
    group.expenses.map((e) => ({
      amount: e.amount,
      paidById: e.paidById,
      splits: e.splits.map((s) => ({ userId: s.userId, amount: s.amount })),
    })),
    group.settlements.map((s) => ({ amount: s.amount, fromId: s.fromId, toId: s.toId })),
  );
  return {
    totalSpend: group.expenses.reduce((sum, e) => sum + e.amount, 0),
    balances,
    simplifiedDebts: simplifyDebts(balances),
  };
}

export async function getGroupSettlements(groupId: string) {
  const [settlements, members] = await Promise.all([
    prisma.settlement.findMany({
      where: { groupId, deletedAt: null },
      include: {
        from: { select: { id: true, name: true } },
        to: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.groupMember.findMany({
      where: { groupId, removedAt: null },
      include: { user: { select: { id: true, name: true, email: true, profilePhoto: true } } },
    }),
  ]);
  return {
    settlements,
    members: members.map((m) => ({ userId: m.userId, name: m.user.name, role: m.role, user: m.user })),
  };
}
