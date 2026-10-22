import { revalidateTag } from "next/cache";
import { prisma } from "./prisma";

/**
 * Invalidate a user's cached Home data (group balances and activity).
 * Called after any group change that affects them.
 */
export function invalidateDashboard(userId: string) {
  revalidateTag(`dashboard-${userId}`, "max");
}

/**
 * Invalidate the dashboard cache for ALL members of a group.
 * Called after group expense, settlement, or membership changes.
 */
export async function invalidateGroupMemberDashboards(groupId: string) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });

  for (const member of members) {
    invalidateDashboard(member.userId);
  }
}
