import { startOfMonth } from "date-fns";
import { prisma } from "./prisma";
import { computeMemberBalances, simplifyDebts } from "./group-balances";

const round = (n: number) => Math.round(n * 100) / 100;

export interface HomePerson {
  id: string;
  name: string;
  profilePhoto: string | null;
  /** Positive: they owe you. Negative: you owe them. Summed over the groups' suggested payments. */
  net: number;
  groups: { id: string; name: string; amount: number }[];
}

export interface HomeGroup {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  members: { id: string; name: string; profilePhoto: string | null }[];
  myBalance: number;
  spendThisMonth: number;
  expenseCount: number;
  lastActivityAt: string | null;
}

export interface HomeData {
  totals: { owedToYou: number; youOwe: number; net: number };
  groups: HomeGroup[];
  people: HomePerson[];
  spendThisMonth: number;
}

/**
 * Everything the Home screen shows, computed from the groups where the user is an active member:
 * balances use the same rules as the group page (active expenses and settlements only).
 */
export async function getHomeData(userId: string): Promise<HomeData> {
  const monthStart = startOfMonth(new Date());
  const memberships = await prisma.groupMember.findMany({
    where: { userId, removedAt: null, group: { deletedAt: null } },
    include: {
      group: {
        include: {
          members: { include: { user: { select: { id: true, name: true, profilePhoto: true } } } },
          expenses: {
            where: { deletedAt: null },
            select: { amount: true, paidById: true, date: true, createdAt: true, updatedAt: true, splits: { select: { userId: true, amount: true } } },
          },
          settlements: { where: { deletedAt: null }, select: { amount: true, fromId: true, toId: true, createdAt: true } },
        },
      },
    },
  });

  const people = new Map<string, HomePerson>();
  let owedToYou = 0;
  let youOwe = 0;

  const groups: HomeGroup[] = memberships.map(({ group }) => {
    const users = new Map(group.members.map((m) => [m.userId, m.user]));
    const balances = computeMemberBalances(
      group.members.map((m) => ({ userId: m.userId, name: m.user.name })),
      group.expenses,
      group.settlements,
    );
    const myBalance = balances.find((b) => b.userId === userId)?.balance ?? 0;
    if (myBalance > 0) owedToYou += myBalance;
    else youOwe -= myBalance;

    for (const d of simplifyDebts(balances)) {
      if (d.fromId !== userId && d.toId !== userId) continue;
      const otherId = d.fromId === userId ? d.toId : d.fromId;
      const signed = d.toId === userId ? d.amount : -d.amount;
      const user = users.get(otherId);
      const person = people.get(otherId) ?? {
        id: otherId,
        name: user?.name ?? (d.fromId === userId ? d.toName : d.fromName),
        profilePhoto: user?.profilePhoto ?? null,
        net: 0,
        groups: [],
      };
      person.net = round(person.net + signed);
      person.groups.push({ id: group.id, name: group.name, amount: signed });
      people.set(otherId, person);
    }

    const times = [
      ...group.expenses.map((e) => e.updatedAt.getTime()),
      ...group.settlements.map((s) => s.createdAt.getTime()),
      group.updatedAt.getTime(),
    ];
    const active = group.members.filter((m) => !m.removedAt);
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: active.length,
      members: active.map((m) => ({ id: m.user.id, name: m.user.name, profilePhoto: m.user.profilePhoto })),
      myBalance,
      spendThisMonth: round(group.expenses.filter((e) => e.date >= monthStart).reduce((sum, e) => sum + e.amount, 0)),
      expenseCount: group.expenses.length,
      lastActivityAt: times.length ? new Date(Math.max(...times)).toISOString() : null,
    };
  });

  groups.sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""));

  return {
    totals: { owedToYou: round(owedToYou), youOwe: round(youOwe), net: round(owedToYou - youOwe) },
    groups,
    people: [...people.values()].filter((p) => Math.abs(p.net) >= 0.01).sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
    spendThisMonth: round(groups.reduce((sum, g) => sum + g.spendThisMonth, 0)),
  };
}
