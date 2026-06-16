import { NextResponse } from "next/server";
import { requireAuth, handleZodError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { groupSchema } from "@/lib/validators";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const memberships = await prisma.groupMember.findMany({
    where: { userId: auth.session.user.id },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          _count: { select: { expenses: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const groups = memberships.map((m) => ({
    ...m.group,
    expenseCount: m.group._count.expenses,
    myRole: m.role,
  }));

  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const data = groupSchema.parse(body);

    const emails = (data.memberEmails ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const uniqueEmails = [...new Set(emails)].filter(
      (e) => e !== auth.session.user.email!.toLowerCase(),
    );

    const users = uniqueEmails.length
      ? await prisma.user.findMany({
          where: { email: { in: uniqueEmails } },
          select: { id: true, email: true },
        })
      : [];

    const foundEmails = new Set(users.map((u) => u.email));
    const missing = uniqueEmails.filter((e) => !foundEmails.has(e));

    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Some member emails were not found", missing },
        { status: 400 },
      );
    }

    const group = await prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        members: {
          create: [
            {
              userId: auth.session.user.id,
              role: "ADMIN",
            },
            ...users.map((u) => ({
              userId: u.id,
              role: "MEMBER" as const,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return handleZodError(error);
  }
}
