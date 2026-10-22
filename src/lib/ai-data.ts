import { prisma } from "./prisma";
import { startOfMonth, subMonths, format } from "date-fns";
import { computeMemberBalances, simplifyDebts } from "./group-balances";

/** Everything the AI advisor knows about a user: their groups, never anyone else's. */
export type AIGroupContext = {
  currency: string;
  currentMonth: string;
  /** Across all groups: what others owe the user, what the user owes, and the difference. */
  totals: { owedToYou: number; youOwe: number; net: number };
  /** Last 3 months across all groups, oldest first. */
  monthly: { month: string; groupSpend: number; yourShare: number; youPaid: number }[];
  groups: {
    name: string;
    memberCount: number;
    yourBalance: number;
    spendThisMonth: number;
    yourShareThisMonth: number;
    spendLast3Months: number;
    expenseCount: number;
    /** The suggested settle-up payments that involve the user. */
    settleUp: { from: string; to: string; amount: number }[];
  }[];
  /** Net position with each person across all groups (positive = they owe the user). */
  people: { name: string; net: number }[];
  /** The largest expenses this month across the user's groups. */
  biggestThisMonth: { group: string; description: string; amount: number; paidBy: string; yourShare: number; date: string }[];
};

const round = (n: number) => Math.round(n * 100) / 100;

export async function getAIContext(userId: string): Promise<AIGroupContext> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const windowStart = startOfMonth(subMonths(now, 2));

  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }),
    prisma.groupMember.findMany({
      where: { userId, removedAt: null, group: { deletedAt: null } },
      include: {
        group: {
          include: {
            members: { include: { user: { select: { id: true, name: true } } } },
            expenses: {
              where: { deletedAt: null },
              include: { splits: true, paidBy: { select: { id: true, name: true } } },
            },
            settlements: { where: { deletedAt: null } },
          },
        },
      },
    }),
  ]);

  const months = Array.from({ length: 3 }, (_, i) => {
    const d = subMonths(now, 2 - i);
    return { key: format(d, "yyyy-MM"), month: format(d, "MMMM yyyy"), groupSpend: 0, yourShare: 0, youPaid: 0 };
  });
  const people = new Map<string, { name: string; net: number }>();
  const biggest: AIGroupContext["biggestThisMonth"] = [];
  let owedToYou = 0;
  let youOwe = 0;

  const groups = memberships.map(({ group }) => {
    const members = group.members.map((m) => ({ userId: m.userId, name: m.user.name }));
    const expenses = group.expenses.map((e) => ({
      amount: e.amount,
      paidById: e.paidById,
      splits: e.splits.map((s) => ({ userId: s.userId, amount: s.amount })),
    }));
    const balances = computeMemberBalances(members, expenses, group.settlements);
    const yourBalance = balances.find((b) => b.userId === userId)?.balance ?? 0;
    if (yourBalance > 0) owedToYou += yourBalance;
    else youOwe -= yourBalance;

    const settleUp = simplifyDebts(balances)
      .filter((d) => d.fromId === userId || d.toId === userId)
      .map((d) => {
        const other = d.fromId === userId ? { id: d.toId, name: d.toName } : { id: d.fromId, name: d.fromName };
        const entry = people.get(other.id) ?? { name: other.name, net: 0 };
        entry.net += d.toId === userId ? d.amount : -d.amount;
        people.set(other.id, entry);
        return { from: d.fromId === userId ? "You" : d.fromName, to: d.toId === userId ? "You" : d.toName, amount: d.amount };
      });

    let spendThisMonth = 0;
    let yourShareThisMonth = 0;
    let spendLast3Months = 0;
    for (const e of group.expenses) {
      const share = e.splits.find((s) => s.userId === userId)?.amount ?? 0;
      if (e.date >= windowStart) {
        spendLast3Months += e.amount;
        const bucket = months.find((m) => m.key === format(e.date, "yyyy-MM"));
        if (bucket) {
          bucket.groupSpend += e.amount;
          bucket.yourShare += share;
          if (e.paidById === userId) bucket.youPaid += e.amount;
        }
      }
      if (e.date >= monthStart) {
        spendThisMonth += e.amount;
        yourShareThisMonth += share;
        biggest.push({
          group: group.name,
          description: e.description,
          amount: e.amount,
          paidBy: e.paidById === userId ? "You" : e.paidBy.name,
          yourShare: share,
          date: format(e.date, "yyyy-MM-dd"),
        });
      }
    }

    return {
      name: group.name,
      memberCount: group.members.filter((m) => !m.removedAt).length,
      yourBalance,
      spendThisMonth: round(spendThisMonth),
      yourShareThisMonth: round(yourShareThisMonth),
      spendLast3Months: round(spendLast3Months),
      expenseCount: group.expenses.length,
      settleUp,
    };
  });

  return {
    currency: user?.currency ?? "INR",
    currentMonth: format(now, "MMMM yyyy"),
    totals: { owedToYou: round(owedToYou), youOwe: round(youOwe), net: round(owedToYou - youOwe) },
    monthly: months.map(({ month, groupSpend, yourShare, youPaid }) => ({
      month,
      groupSpend: round(groupSpend),
      yourShare: round(yourShare),
      youPaid: round(youPaid),
    })),
    groups,
    people: [...people.values()].map((p) => ({ name: p.name, net: round(p.net) })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
    biggestThisMonth: biggest.sort((a, b) => b.amount - a.amount).slice(0, 5),
  };
}

/** Group expenses the user can see that match the advisor's parsed question. */
export async function findRelevantGroupExpenses(
  userId: string,
  filters: { searchQuery: string; dateStart: string | null; dateEnd: string | null; minAmount: number | null; maxAmount: number | null },
) {
  // The filters come from a language model, so anything malformed is ignored rather than trusted
  const toDate = (s: string | null) => {
    const d = s ? new Date(s) : null;
    return d && !Number.isNaN(d.getTime()) ? d : undefined;
  };
  const toAmount = (n: number | null) => (typeof n === "number" && Number.isFinite(n) ? n : undefined);
  const from = toDate(filters.dateStart);
  const to = toDate(filters.dateEnd);
  const min = toAmount(filters.minAmount);
  const max = toAmount(filters.maxAmount);

  const base = {
    deletedAt: null,
    group: { deletedAt: null, members: { some: { userId, removedAt: null } } },
    ...(from || to ? { date: { gte: from, lte: to } } : {}),
    ...(min !== undefined || max !== undefined ? { amount: { gte: min, lte: max } } : {}),
  };
  const query = (where: object) =>
    prisma.groupExpense.findMany({
      where: { ...base, ...where },
      orderBy: { date: "desc" },
      take: 15,
      include: {
        group: { select: { name: true } },
        paidBy: { select: { id: true, name: true } },
        splits: { where: { userId }, select: { amount: true } },
      },
    });

  const term = filters.searchQuery.trim();
  let rows = term ? await query({ description: { contains: term.slice(0, 100), mode: "insensitive" } }) : [];
  // No description matched: fall back to the date/amount filters alone
  if (rows.length === 0) rows = await query({});

  return rows.map((e) => ({
    date: format(e.date, "yyyy-MM-dd"),
    group: e.group.name,
    description: e.description,
    amount: e.amount,
    paidBy: e.paidById === userId ? "You" : e.paidBy.name,
    yourShare: e.splits[0]?.amount ?? 0,
  }));
}

export type RelevantGroupExpense = Awaited<ReturnType<typeof findRelevantGroupExpenses>>[number];
