import { basePrisma } from "./prisma";

/**
 * Creates an isolated, tenant-safe Prisma Client instance for the current request context.
 * 
 * - Automatic row-level enforcement: All queries on personal data models (expenses, income,
 *   savings, etc.) are forced to match the current user's `userId`.
 * - Group membership guardrails: Group-scoped expense operations automatically verify that
 *   the querying user is an active member of the target group.
 * - User update constraints: User updates are limited to the active session user's record.
 */
export function getIsolatedClient(userId: string) {
  if (!userId) {
    throw new Error("Database isolation requires a valid session userId.");
  }

  return basePrisma.$extends({
    name: "data-isolation-extension",
    query: {
      personalExpense: {
        async $allOperations({ operation, args, query }) {
          const a = args as any;
          if (operation === "create") {
            a.data = { ...a.data, userId };
          } else if (operation === "createMany") {
            if (Array.isArray(a.data)) {
              a.data = a.data.map((item: any) => ({ ...item, userId }));
            } else {
              a.data = { ...a.data, userId };
            }
          } else {
            a.where = { ...a.where, userId };
          }
          return query(args);
        },
      },
      income: {
        async $allOperations({ operation, args, query }) {
          const a = args as any;
          if (operation === "create") {
            a.data = { ...a.data, userId };
          } else if (operation === "createMany") {
            if (Array.isArray(a.data)) {
              a.data = a.data.map((item: any) => ({ ...item, userId }));
            } else {
              a.data = { ...a.data, userId };
            }
          } else {
            a.where = { ...a.where, userId };
          }
          return query(args);
        },
      },
      saving: {
        async $allOperations({ operation, args, query }) {
          const a = args as any;
          if (operation === "create") {
            a.data = { ...a.data, userId };
          } else if (operation === "createMany") {
            if (Array.isArray(a.data)) {
              a.data = a.data.map((item: any) => ({ ...item, userId }));
            } else {
              a.data = { ...a.data, userId };
            }
          } else {
            a.where = { ...a.where, userId };
          }
          return query(args);
        },
      },
      savingsGoal: {
        async $allOperations({ operation, args, query }) {
          const a = args as any;
          if (operation === "create") {
            a.data = { ...a.data, userId };
          } else if (operation === "createMany") {
            if (Array.isArray(a.data)) {
              a.data = a.data.map((item: any) => ({ ...item, userId }));
            } else {
              a.data = { ...a.data, userId };
            }
          } else {
            a.where = { ...a.where, userId };
          }
          return query(args);
        },
      },
      recurringExpense: {
        async $allOperations({ operation, args, query }) {
          const a = args as any;
          if (operation === "create") {
            a.data = { ...a.data, userId };
          } else if (operation === "createMany") {
            if (Array.isArray(a.data)) {
              a.data = a.data.map((item: any) => ({ ...item, userId }));
            } else {
              a.data = { ...a.data, userId };
            }
          } else {
            a.where = { ...a.where, userId };
          }
          return query(args);
        },
      },
      group: {
        async $allOperations({ operation, args, query }) {
          const a = args as any;
          if (operation === "create" || operation === "createMany") {
            return query(args);
          }
          // Enforce that any group queried, updated, or deleted must contain the user as a member
          a.where = {
            ...a.where,
            members: {
              some: { userId },
            },
          };
          return query(args);
        },
      },
      groupMember: {
        async $allOperations({ operation, args, query }) {
          const a = args as any;
          if (operation === "create" || operation === "createMany") {
            return query(args);
          }
          // Constrain group membership lookups and modifications to only those groups where the user is an active member
          a.where = {
            ...a.where,
            group: {
              members: {
                some: { userId },
              },
            },
          };
          return query(args);
        },
      },
      groupExpense: {
        async $allOperations({ operation, args, query }) {
          const a = args as any;
          let groupId = a.where?.groupId || a.data?.groupId;

          // If the query does not specify a groupId directly, look it up by ID using basePrisma
          if (!groupId && a.where?.id) {
            const expense = await basePrisma.groupExpense.findUnique({
              where: { id: a.where.id },
              select: { groupId: true },
            });
            if (expense) {
              groupId = expense.groupId;
            }
          }

          if (groupId) {
            // Verify the current user is active in the group
            const member = await basePrisma.groupMember.findUnique({
              where: {
                userId_groupId: { userId, groupId },
              },
            });
            if (!member) {
              throw new Error("Access Denied: Not an active member of this group");
            }
          } else if (operation !== "create" && operation !== "createMany") {
            // Fallback: Constrain any search/update/delete to group expenses in groups where the user is active
            a.where = {
              ...a.where,
              group: {
                members: {
                  some: { userId },
                },
              },
            };
          }
          return query(args);
        },
      },
      settlement: {
        async $allOperations({ operation, args, query }) {
          const a = args as any;
          let groupId = a.where?.groupId || a.data?.groupId;

          // Resolve groupId if not directly present in where/data blocks
          if (!groupId && a.where?.id) {
            const sett = await basePrisma.settlement.findUnique({
              where: { id: a.where.id },
              select: { groupId: true },
            });
            if (sett) {
              groupId = sett.groupId;
            }
          }

          if (groupId) {
            const member = await basePrisma.groupMember.findUnique({
              where: {
                userId_groupId: { userId, groupId },
              },
            });
            if (!member) {
              throw new Error("Access Denied: Not an active member of this group");
            }
          } else if (operation !== "create" && operation !== "createMany") {
            a.where = {
              ...a.where,
              group: {
                members: {
                  some: { userId },
                },
              },
            };
          }
          return query(args);
        },
      },
      user: {
        async $allOperations({ operation, args, query }) {
          const a = args as any;
          // Block any attempt to update/delete other users' account records
          if (
            operation === "update" ||
            operation === "updateMany" ||
            operation === "delete" ||
            operation === "deleteMany"
          ) {
            a.where = { ...a.where, id: userId };
          }
          return query(args);
        },
      },
    },
  });
}
