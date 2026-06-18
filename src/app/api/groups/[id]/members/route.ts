import { NextResponse } from "next/server";
import {
  requireAuth,
  requireGroupAdmin,
  requireGroupMember,
  handleZodError,
  getBaseUrl,
} from "@/lib/auth";
import { invalidateDashboard, invalidateGroupMemberDashboards } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { addMemberByIdSchema } from "@/lib/validators";
import { sendGroupInvitationEmail } from "@/lib/email";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  try {
    const body = await request.json();
    const { id, email } = addMemberByIdSchema.parse(body);

    if (!id && !email) {
      return NextResponse.json({ error: "Either id or email is required" }, { status: 400 });
    }

    let user = null;
    if (id) {
      user = await prisma.user.findUnique({
        where: { id },
      });
    } else if (email) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!user) {
      if (!email) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const targetEmail = email.toLowerCase();
      await prisma.groupInvitation.upsert({
        where: {
          email_groupId: { email: targetEmail, groupId },
        },
        create: {
          email: targetEmail,
          groupId,
          invitedBy: auth.session.user.name || "A friend",
        },
        update: {},
      });

      const baseUrl = await getBaseUrl();
      await sendGroupInvitationEmail(
        targetEmail,
        group.name,
        auth.session.user.name || "A friend",
        baseUrl
      );

      return NextResponse.json(
        { invited: true, email: targetEmail, message: "Invitation sent successfully" },
        { status: 201 }
      );
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
        user: { select: { id: true, name: true, email: true, profilePhoto: true } },
      },
    });

    // Invalidate dashboard for all existing members and the new member
    await invalidateGroupMemberDashboards(groupId);
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

  // Invalidate all remaining members' dashboards and the removed member's dashboard
  await invalidateGroupMemberDashboards(groupId);
  invalidateDashboard(userId);

  return NextResponse.json({ message: "Member removed" });
}
