import { NextResponse } from "next/server";
import { requireAuth, requireGroupMember } from "@/lib/auth";
import { getGroupBalance } from "@/lib/group-data";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  const balance = await getGroupBalance(groupId);
  if (!balance) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  return NextResponse.json(balance);
}
