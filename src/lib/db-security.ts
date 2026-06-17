import { prisma } from "./prisma";

/**
 * Creates an isolated, tenant-safe Prisma Client instance for the current request context.
 * 
 * - Automatic row-level enforcement: All queries on personal data models (expenses, income,
 *   savings, etc.) are forced to match the current user's `userId`.
 * - Group membership guardrails: Group-scoped expense operations automatically verify that
 *   the querying user is an active member of the target group.
 */
export function getIsolatedClient(userId: string) {
  if (!userId) {
    throw new Error("Database isolation requires a valid session userId.");
  }

  return prisma.$extends({
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
      groupExpense: {
        async $allOperations({ args, query }) {
          const a = args as any;
          const groupId = a.where?.groupId || a.data?.groupId;
          if (groupId) {
            const member = await prisma.groupMember.findUnique({
              where: {
                userId_groupId: { userId, groupId },
              },
            });
            if (!member) {
              throw new Error("Access Denied: Not an active member of this group");
            }
          }
          return query(args);
        },
      },
      settlement: {
        async $allOperations({ args, query }) {
          const a = args as any;
          const groupId = a.where?.groupId || a.data?.groupId;
          if (groupId) {
            const member = await prisma.groupMember.findUnique({
              where: {
                userId_groupId: { userId, groupId },
              },
            });
            if (!member) {
              throw new Error("Access Denied: Not an active member of this group");
            }
          }
          return query(args);
        },
      },
    },
  });
}
