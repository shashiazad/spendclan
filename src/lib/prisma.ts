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
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  globalForPrisma.pool = pool;

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
