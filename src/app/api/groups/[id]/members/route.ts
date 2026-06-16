import { NextResponse } from "next/server";
import {
  requireAuth,
  requireGroupAdmin,
  requireGroupMember,
  handleZodError,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addMemberSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  try {
    const body = await request.json();
    const { email } = addMemberSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId: user.id, groupId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User is already a group member" },
        { status: 409 },
      );
    }

    const member = await prisma.groupMember.create({
      data: {
        userId: user.id,
        groupId,
        role: "MEMBER",
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return handleZodError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const adminCheck = await requireGroupAdmin(groupId, auth.session.user.id);
  if ("error" in adminCheck) return adminCheck.error;

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  if (userId === auth.session.user.id) {
    return NextResponse.json(
      { error: "Cannot remove yourself from the group" },
      { status: 400 },
    );
  }

  const member = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: { userId, groupId },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const adminCount = await prisma.groupMember.count({
    where: { groupId, role: "ADMIN" },
  });

  if (member.role === "ADMIN" && adminCount <= 1) {
    return NextResponse.json(
      { error: "Cannot remove the only group admin" },
      { status: 400 },
    );
  }

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId, groupId } },
  });

  return NextResponse.json({ message: "Member removed" });
}
