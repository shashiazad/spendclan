import { basePrisma } from "./prisma";

/**
 * Returns true if the user has ever been part of a group or appears in any
 * group transaction. Such users must never be hard-deleted, because other
 * members' expenses, splits and settlements reference them.
 *
 * Uses basePrisma so the check sees every group, not just the caller's.
 */
export async function hasGroupHistory(userId: string): Promise<boolean> {
  const [memberships, splits, paid, settlements] = await Promise.all([
    basePrisma.groupMember.count({ where: { userId } }),
    basePrisma.groupSplit.count({ where: { userId } }),
    basePrisma.groupExpense.count({ where: { paidById: userId } }),
    basePrisma.settlement.count({
      where: { OR: [{ fromId: userId }, { toId: userId }] },
    }),
  ]);

  return memberships + splits + paid + settlements > 0;
}
