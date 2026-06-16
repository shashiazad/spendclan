import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      currency: true,
      lastActive: true,
      createdAt: true,
      _count: {
        select: {
          personalExpenses: true,
          incomes: true,
          groupMembers: true,
        },
      },
    },
  });

  const result = users.map(({ _count, ...user }) => ({
    ...user,
    stats: {
      expenses: _count.personalExpenses,
      income: _count.incomes,
      groups: _count.groupMembers,
    },
  }));

  return NextResponse.json({ users: result });
}
