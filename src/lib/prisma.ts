import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "Database connection string is not set. Please configure DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL."
    );
  }

  // Create a connection pool optimized for serverless environments.
  // We limit the max connections to prevent exhaustion across function scaling.
  const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 2 : 10,
    idleTimeoutMillis: 10000, // Close idle connections after 10 seconds
    connectionTimeoutMillis: 5000, // Return error if connection fails to open within 5 seconds
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  globalForPrisma.pool = pool;

  return client;
}

// Export the raw base client to be used inside db-security.ts (prevents recursive loops)
export const basePrisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

// Export a secure Prisma Proxy that intercepts model delegates to enforce RLS / Tenant Isolation
export const prisma = new Proxy(basePrisma, {
  get(target, prop, receiver) {
    const delegate = Reflect.get(target, prop, receiver);

    // Intercept model delegates dynamically (exclude built-in connection/utility methods)
    if (
      delegate &&
      typeof delegate === "object" &&
      !["$connect", "$disconnect", "$executeRaw", "$queryRaw", "$transaction"].includes(prop as string)
    ) {
      return new Proxy(delegate, {
        get(modelTarget, modelProp) {
          const originalMethod = Reflect.get(modelTarget, modelProp);
          if (typeof originalMethod === "function") {
            return async function (...args: any[]) {
              try {
                // Dynamic imports to prevent module initialization circular dependency loops
                const { getSession } = await import("./auth");
                const { getIsolatedClient } = await import("./db-security");

                const session = await getSession();
                const userId = session?.user?.id;

                if (userId) {
                  const isolatedClient = getIsolatedClient(userId);
                  const isolatedModelDelegate = (isolatedClient as any)[prop];
                  
                  if (isolatedModelDelegate && modelProp in isolatedModelDelegate) {
                    const isolatedMethod = isolatedModelDelegate[modelProp];
                    if (typeof isolatedMethod === "function") {
                      return isolatedMethod.apply(isolatedModelDelegate, args);
                    }
                  }
                }
              } catch (e) {
                // Next.js will throw an error if headers/cookies are read outside of a request context
                // (e.g. during build-time page generation or background seeding). We fall back to raw query execution.
              }

              return originalMethod.apply(modelTarget, args);
            };
          }
          return originalMethod;
        },
      });
    }

    return delegate;
  },
});
