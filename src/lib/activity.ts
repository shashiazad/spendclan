import { prisma } from "./prisma";

/**
 * Activity feed built from timestamps the data already has (no separate log table):
 * expenses added, edited and deleted; payments recorded and deleted; members joining and leaving.
 * Only groups where the caller is an active member are included.
 */

export type ActivityType =
  | "expense_added"
  | "expense_edited"
  | "expense_deleted"
  | "settlement"
  | "settlement_deleted"
  | "member_joined"
  | "member_removed";

export interface ActivityEvent {
  key: string;
  type: ActivityType;
  at: string;
  group: { id: string; name: string };
  /** Who did it, when known. */
  actor: { id: string; name: string } | null;
  expense?: { id: string; description: string; amount: number; paidBy: { id: string; name: string }; yourShare: number };
  settlement?: { amount: number; from: { id: string; name: string }; to: { id: string; name: string } };
  member?: { id: string; name: string };
}

export const ACTIVITY_MAX_LIMIT = 50;

export class ActivityCursorError extends Error {}

function decodeCursor(cursor: string): { at: Date; key: string } {
  try {
    const [at, key] = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const date = new Date(at);
    if (typeof key !== "string" || Number.isNaN(date.getTime())) throw new Error();
    return { at: date, key };
  } catch {
    throw new ActivityCursorError("Invalid cursor");
  }
}

const encodeCursor = (e: ActivityEvent) => Buffer.from(JSON.stringify([e.at, e.key])).toString("base64url");

/** Newest first; ties broken by key so paging is stable. */
const newerFirst = (a: ActivityEvent, b: ActivityEvent) => b.at.localeCompare(a.at) || b.key.localeCompare(a.key);

export async function getActivity(
  userId: string,
  opts: { groupId?: string; cursor?: string | null; limit?: number } = {},
): Promise<{ items: ActivityEvent[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), ACTIVITY_MAX_LIMIT);
  const after = opts.cursor ? decodeCursor(opts.cursor) : null;

  const memberships = await prisma.groupMember.findMany({
    where: { userId, removedAt: null, group: { deletedAt: null }, ...(opts.groupId && { groupId: opts.groupId }) },
    select: { group: { select: { id: true, name: true } } },
  });
  const groups = new Map(memberships.map((m) => [m.group.id, m.group]));
  const groupIds = [...groups.keys()];
  if (groupIds.length === 0) return { items: [], nextCursor: null };

  // Each source fetches a little more than a page at or before the cursor; the merge below trims it
  const take = limit + 1;
  const before = (field: string) => (after ? { [field]: { lte: after.at } } : {});
  const inGroups = { groupId: { in: groupIds } };
  const expenseSelect = {
    id: true,
    description: true,
    amount: true,
    groupId: true,
    paidById: true,
    createdById: true,
    deletedById: true,
    createdAt: true,
    deletedAt: true,
    paidBy: { select: { id: true, name: true } },
    splits: { where: { userId }, select: { amount: true } },
  } as const;

  const [added, deleted, revisions, settlements, removedSettlements, joined, removed] = await Promise.all([
    prisma.groupExpense.findMany({ where: { ...inGroups, ...before("createdAt") }, select: expenseSelect, orderBy: { createdAt: "desc" }, take }),
    prisma.groupExpense.findMany({
      where: { ...inGroups, deletedAt: after ? { not: null, lte: after.at } : { not: null } },
      select: expenseSelect,
      orderBy: { deletedAt: "desc" },
      take,
    }),
    prisma.groupExpenseRevision.findMany({
      where: { groupExpense: inGroups, ...before("createdAt") },
      select: { id: true, createdAt: true, editedById: true, groupExpense: { select: expenseSelect } },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.settlement.findMany({
      where: { ...inGroups, ...before("createdAt") },
      include: { from: { select: { id: true, name: true } }, to: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.settlement.findMany({
      where: { ...inGroups, deletedAt: after ? { not: null, lte: after.at } : { not: null } },
      include: { from: { select: { id: true, name: true } }, to: { select: { id: true, name: true } } },
      orderBy: { deletedAt: "desc" },
      take,
    }),
    prisma.groupMember.findMany({
      where: { ...inGroups, ...before("joinedAt") },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "desc" },
      take,
    }),
    prisma.groupMember.findMany({
      where: { ...inGroups, removedAt: after ? { not: null, lte: after.at } : { not: null } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { removedAt: "desc" },
      take,
    }),
  ]);

  // Actor ids without a relation (createdById, deletedById, …) are resolved in one query
  const actorIds = new Set<string>();
  for (const e of [...added, ...deleted]) {
    if (e.createdById) actorIds.add(e.createdById);
    if (e.deletedById) actorIds.add(e.deletedById);
  }
  for (const r of revisions) actorIds.add(r.editedById);
  for (const s of removedSettlements) if (s.deletedById) actorIds.add(s.deletedById);
  for (const m of removed) if (m.removedById) actorIds.add(m.removedById);
  const users = new Map(
    (await prisma.user.findMany({ where: { id: { in: [...actorIds] } }, select: { id: true, name: true } })).map((u) => [u.id, u]),
  );
  const person = (id: string | null | undefined) => (id ? users.get(id) ?? { id, name: "Someone" } : null);
  const group = (id: string) => groups.get(id) ?? { id, name: "Group" };
  const expenseOf = (e: (typeof added)[number]) => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    paidBy: e.paidBy,
    yourShare: e.splits[0]?.amount ?? 0,
  });

  const events: ActivityEvent[] = [
    ...added.map((e) => ({
      key: `ea:${e.id}`,
      type: "expense_added" as const,
      at: e.createdAt.toISOString(),
      group: group(e.groupId),
      actor: person(e.createdById) ?? e.paidBy,
      expense: expenseOf(e),
    })),
    ...deleted.map((e) => ({
      key: `ed:${e.id}`,
      type: "expense_deleted" as const,
      at: e.deletedAt!.toISOString(),
      group: group(e.groupId),
      actor: person(e.deletedById),
      expense: expenseOf(e),
    })),
    ...revisions.map((r) => ({
      key: `er:${r.id}`,
      type: "expense_edited" as const,
      at: r.createdAt.toISOString(),
      group: group(r.groupExpense.groupId),
      actor: person(r.editedById),
      expense: expenseOf(r.groupExpense),
    })),
    ...settlements.map((s) => ({
      key: `s:${s.id}`,
      type: "settlement" as const,
      at: s.createdAt.toISOString(),
      group: group(s.groupId),
      actor: s.from,
      settlement: { amount: s.amount, from: s.from, to: s.to },
    })),
    ...removedSettlements.map((s) => ({
      key: `sd:${s.id}`,
      type: "settlement_deleted" as const,
      at: s.deletedAt!.toISOString(),
      group: group(s.groupId),
      actor: person(s.deletedById),
      settlement: { amount: s.amount, from: s.from, to: s.to },
    })),
    ...joined.map((m) => ({
      key: `mj:${m.id}`,
      type: "member_joined" as const,
      at: m.joinedAt.toISOString(),
      group: group(m.groupId),
      actor: null,
      member: m.user,
    })),
    ...removed.map((m) => ({
      key: `mr:${m.id}`,
      type: "member_removed" as const,
      at: m.removedAt!.toISOString(),
      group: group(m.groupId),
      actor: person(m.removedById),
      member: m.user,
    })),
  ];

  const cursorEvent = after && ({ at: after.at.toISOString(), key: after.key } as ActivityEvent);
  const page = events
    .filter((e) => !cursorEvent || newerFirst(cursorEvent, e) < 0)
    .sort(newerFirst)
    .slice(0, limit + 1);
  const items = page.slice(0, limit);
  return { items, nextCursor: page.length > limit ? encodeCursor(items[items.length - 1]) : null };
}
