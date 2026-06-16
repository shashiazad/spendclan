import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth-options";
import { prisma } from "./prisma";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastActive: new Date() },
  }).catch(() => {});

  return { session };
}

export async function requireAdmin() {
  const auth = await requireAuth();
  if ("error" in auth) return auth;

  if (auth.session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return auth;
}

export async function requireGroupMember(groupId: string, userId: string) {
  const member = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: { userId, groupId },
    },
  });

  if (!member) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { member };
}

export async function requireGroupAdmin(groupId: string, userId: string) {
  const result = await requireGroupMember(groupId, userId);
  if ("error" in result) return result;

  if (result.member.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return result;
}

export function parseJsonBody<T>(body: unknown): T {
  return body as T;
}

export function handleZodError(error: unknown) {
  if (error && typeof error === "object" && "issues" in error) {
    return NextResponse.json(
      { error: "Validation failed", details: (error as { issues: unknown[] }).issues },
      { status: 400 },
    );
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
