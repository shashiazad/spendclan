import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleSearchRequest } from "@/lib/expense-search-server";

/**
 * GET /api/expenses — search expenses across every group the caller is an active member of.
 * A `groupId` filter narrows that set; ids of other groups are ignored, never searched.
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const userId = auth.session.user.id;

  return handleSearchRequest(request, userId, async (f) => {
    const memberships = await prisma.groupMember.findMany({
      where: { userId, removedAt: null, group: { deletedAt: null } },
      select: { groupId: true },
    });
    const mine = memberships.map((m) => m.groupId);
    return f.groupId.length ? mine.filter((id) => f.groupId.includes(id)) : mine;
  });
}
