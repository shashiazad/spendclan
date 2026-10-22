import { NextResponse } from "next/server";
import { requireAuth, handleZodError, getBaseUrl } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { groupSchema } from "@/lib/validators";
import { sendGroupInvitationEmail } from "@/lib/email";
import { invalidateGroupMemberDashboards } from "@/lib/cache";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const memberships = await prisma.groupMember.findMany({
    where: { userId: auth.session.user.id, removedAt: null, group: { deletedAt: null } },
    include: {
      group: {
        include: {
          members: {
            where: { removedAt: null },
            include: {
              user: {
                select: { id: true, name: true, email: true, profilePhoto: true },
              },
            },
          },
          _count: { select: { expenses: { where: { deletedAt: null } } } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  // The caller's balance in each group, same formula as computeMemberBalances:
  // paid − own shares + settlements sent − settlements received (active rows only)
  const userId = auth.session.user.id;
  const groupIds = memberships.map((m) => m.groupId);
  const [paid, shares, sent, received] = groupIds.length === 0 ? [[], [], [], []] : await Promise.all([
    prisma.groupExpense.groupBy({
      by: ["groupId"],
      where: { groupId: { in: groupIds }, paidById: userId, deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.groupSplit.findMany({
      where: { userId, groupExpense: { groupId: { in: groupIds }, deletedAt: null } },
      select: { amount: true, groupExpense: { select: { groupId: true } } },
    }),
    prisma.settlement.groupBy({
      by: ["groupId"],
      where: { groupId: { in: groupIds }, fromId: userId, deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.settlement.groupBy({
      by: ["groupId"],
      where: { groupId: { in: groupIds }, toId: userId, deletedAt: null },
      _sum: { amount: true },
    }),
  ]);
  const balances = new Map<string, number>();
  const add = (groupId: string, amount: number) => balances.set(groupId, (balances.get(groupId) ?? 0) + amount);
  for (const row of paid) add(row.groupId, row._sum.amount ?? 0);
  for (const row of shares) add(row.groupExpense.groupId, -row.amount);
  for (const row of sent) add(row.groupId, row._sum.amount ?? 0);
  for (const row of received) add(row.groupId, -(row._sum.amount ?? 0));

  const groups = memberships.map((m) => ({
    ...m.group,
    expenseCount: m.group._count.expenses,
    myRole: m.role,
    userBalance: Math.round((balances.get(m.groupId) ?? 0) * 100) / 100,
  }));

  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const data = groupSchema.parse(body);

    // 1. Gather all unique emails and user IDs from input
    const memberIds = new Set<string>();
    const inputEmails = new Set<string>();

    if (data.members && data.members.length > 0) {
      for (const m of data.members) {
        if (m.id) memberIds.add(m.id);
        if (m.email) inputEmails.add(m.email.trim().toLowerCase());
      }
    }

    if (data.memberEmails) {
      const legacyEmails = data.memberEmails
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      for (const e of legacyEmails) {
        inputEmails.add(e);
      }
    }

    // Exclude current user from member inputs
    memberIds.delete(auth.session.user.id);
    if (auth.session.user.email) {
      inputEmails.delete(auth.session.user.email.toLowerCase());
    }

    // 2. Fetch users by ID
    const usersById = memberIds.size
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(memberIds) } },
          select: { id: true, email: true },
        })
      : [];

    // Add their emails to inputEmails to make sure we treat them as registered users
    for (const u of usersById) {
      if (u.email) {
        inputEmails.add(u.email.toLowerCase());
      }
    }

    // 3. Fetch users by Email
    const usersByEmail = inputEmails.size
      ? await prisma.user.findMany({
          where: { email: { in: Array.from(inputEmails) } },
          select: { id: true, email: true },
        })
      : [];

    // Combine users into a Map (email -> id)
    const allUsersMap = new Map<string, string>();
    for (const u of usersById) {
      if (u.email) {
        allUsersMap.set(u.email.toLowerCase(), u.id);
      }
    }
    for (const u of usersByEmail) {
      if (u.email) {
        allUsersMap.set(u.email.toLowerCase(), u.id);
      }
    }

    const registeredUserIds = Array.from(new Set(allUsersMap.values()));
    const unregisteredEmails = Array.from(inputEmails).filter(
      (email) => !allUsersMap.has(email)
    );

    // 4. Create the group
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
            ...registeredUserIds.map((userId) => ({
              userId,
              role: "MEMBER" as const,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, profilePhoto: true } },
          },
        },
      },
    });

    // 5. Handle invitations for unregistered emails
    if (unregisteredEmails.length > 0) {
      const baseUrl = await getBaseUrl();
      const inviterName = auth.session.user.name || "A friend";

      await Promise.all(
        unregisteredEmails.map(async (email) => {
          try {
            await prisma.groupInvitation.upsert({
              where: {
                email_groupId: { email, groupId: group.id },
              },
              create: {
                email,
                groupId: group.id,
                invitedBy: inviterName,
              },
              update: {},
            });

            await sendGroupInvitationEmail(email, group.name, inviterName, baseUrl);
          } catch (e) {
            console.error(`Failed to create/send invitation for ${email}:`, e);
          }
        })
      );
    }

    // 6. Invalidate dashboard cache for all members
    await invalidateGroupMemberDashboards(group.id);

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return handleZodError(error);
  }
}
