import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient() {
  let connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "Database connection string is not set. Please configure DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL."
    );
  }

  // Sanitize connection string to explicitly use 'verify-full' instead of 'require'
  // to prevent the pg driver security warnings.
  if (connectionString.includes("sslmode=require")) {
    connectionString = connectionString.replace("sslmode=require", "sslmode=verify-full");
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

  // Self-healing database functions setup
  ensureDatabaseFunctions(client).catch((err) => {
    console.error("[Prisma Setup] Database functions initialization failed:", err);
  });

  globalForPrisma.pool = pool;

  return client;
}

async function ensureDatabaseFunctions(client: PrismaClient) {
  try {
    // Check if function already exists to prevent concurrent update collisions in PostgreSQL
    const exists = await client.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'cosine_similarity'
      ) as exists;
    `);

    if (exists?.[0]?.exists) {
      return;
    }

    await client.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION cosine_similarity(a double precision[], b double precision[])
      RETURNS double precision AS $$
      DECLARE
        dot_product double precision := 0;
        norm_a double precision := 0;
        norm_b double precision := 0;
        i integer;
      BEGIN
        IF array_length(a, 1) IS NULL OR array_length(b, 1) IS NULL OR array_length(a, 1) != array_length(b, 1) THEN
          RETURN 0;
        END IF;
        FOR i IN 1..array_length(a, 1) LOOP
          dot_product := dot_product + a[i] * b[i];
          norm_a := norm_a + a[i] * a[i];
          norm_b := norm_b + b[i] * b[i];
        END LOOP;
        IF norm_a = 0 OR norm_b = 0 THEN
          RETURN 0;
        END IF;
        RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);
  } catch (err) {
    // Suppress warnings during Next.js build phase where database might be offline
    if (process.env.NODE_ENV !== "production") {
      console.warn("⚠️ [Prisma Setup] Could not verify database cosine_similarity function (database might be offline):", err instanceof Error ? err.message : err);
    }
  }
}

// Export the raw base client to be used inside db-security.ts (prevents recursive loops)
export const basePrisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

const MODEL_DELEGATES = new Set([
  "user",
  "personalExpense",
  "income",
  "saving",
  "savingsGoal",
  "recurringExpense",
  "group",
  "groupMember",
  "groupExpense",
  "groupSplit",
  "settlement",
  "passwordResetToken",
  "groupInvitation",
]);

// Export a secure Prisma Proxy that intercepts model delegates to enforce RLS / Tenant Isolation
export const prisma = new Proxy(basePrisma, {
  get(target, prop, receiver) {
    const delegate = Reflect.get(target, prop, receiver);

    // Intercept model delegates dynamically to enforce RLS / Tenant Isolation
    if (
      delegate &&
      typeof delegate === "object" &&
      typeof prop === "string" &&
      MODEL_DELEGATES.has(prop)
    ) {
      return new Proxy(delegate, {
        get(modelTarget, modelProp) {
          const originalMethod = Reflect.get(modelTarget, modelProp);
          if (typeof originalMethod === "function") {
            return async function (...args: unknown[]) {
              try {
                // Dynamic imports to prevent module initialization circular dependency loops
                const { getSession } = await import("./auth");
                const { getIsolatedClient } = await import("./db-security");

                const session = await getSession();
                const userId = session?.user?.id;

                if (userId) {
                  const isolatedClient = getIsolatedClient(userId);
                  const isolatedModelDelegate = (isolatedClient as Record<string | symbol, unknown>)[prop];
                  
                  if (
                    isolatedModelDelegate && 
                    typeof isolatedModelDelegate === "object" && 
                    modelProp in isolatedModelDelegate
                  ) {
                    const isolatedMethod = (isolatedModelDelegate as Record<string | symbol, unknown>)[modelProp];
                    if (typeof isolatedMethod === "function") {
                      return isolatedMethod.apply(isolatedModelDelegate, args);
                    }
                  }
                }
              } catch {
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
