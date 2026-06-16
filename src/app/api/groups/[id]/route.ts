import { NextResponse } from "next/server";
import { requireAuth, requireGroupAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  const adminCheck = await requireGroupAdmin(id, auth.session.user.id);
  if ("error" in adminCheck) return adminCheck.error;

  await prisma.group.delete({ where: { id } });

  return NextResponse.json({ message: "Group deleted" });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const isMember = group.members.some((m) => m.userId === auth.session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({ group });
}

