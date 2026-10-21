import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasGroupHistory } from "@/lib/group-history";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  if (id === auth.session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.role === "ADMIN") {
    return NextResponse.json(
      { error: "Cannot delete admin users" },
      { status: 403 },
    );
  }

  // Users referenced by group members or transactions are never deleted
  if (await hasGroupHistory(id)) {
    return NextResponse.json(
      { error: "Cannot delete a user who belongs to groups or has group transactions" },
      { status: 409 },
    );
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ message: "User deleted" });
}
