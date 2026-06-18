import { revalidateTag } from "next/cache";
import { prisma } from "./prisma";

/**
 * Invalidate the dashboard cache for a specific user.
 * Called after any mutation that affects dashboard data
 * (expenses, income, savings, group changes).
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
