import { NextResponse } from "next/server";
import {
  requireAuth,
  requireGroupMember,
  handleZodError,
} from "@/lib/auth";
import { invalidateGroupMemberDashboards } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { settlementSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  const [settlements, members] = await Promise.all([
    prisma.settlement.findMany({
      where: { groupId },
      include: {
        from: { select: { id: true, name: true } },
        to: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true, email: true, profilePhoto: true } },
      },
    }),
  ]);

  return NextResponse.json({
    settlements,
    members: members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      role: m.role,
      user: m.user,
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  try {
    const body = await request.json();
    const data = settlementSchema.parse(body);
    const fromId = auth.session.user.id;

    if (fromId === data.toId) {
      return NextResponse.json(
        { error: "Cannot settle with yourself" },
        { status: 400 },
      );
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((m) => m.userId));

    if (!memberIds.has(fromId) || !memberIds.has(data.toId)) {
      return NextResponse.json(
        { error: "Both parties must be group members" },
        { status: 400 },
      );
    }

    const settlement = await prisma.settlement.create({
      data: {
        amount: data.amount,
        fromId,
        toId: data.toId,
        groupId,
      },
      include: {
        from: { select: { id: true, name: true } },
        to: { select: { id: true, name: true } },
      },
    });

    await invalidateGroupMemberDashboards(groupId);
    return NextResponse.json({ settlement }, { status: 201 });
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

  const settlementId = new URL(request.url).searchParams.get("id");
  if (!settlementId) {
    return NextResponse.json(
      { error: "Missing settlement id" },
      { status: 400 },
    );
  }

  const settlement = await prisma.settlement.findFirst({
    where: { id: settlementId, groupId },
  });

  if (!settlement) {
    return NextResponse.json(
      { error: "Settlement not found" },
      { status: 404 },
    );
  }

  await prisma.settlement.delete({ where: { id: settlementId } });

  await invalidateGroupMemberDashboards(groupId);
  return NextResponse.json({ message: "Settlement deleted" });
}
