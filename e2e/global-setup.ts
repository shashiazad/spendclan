import { execFileSync } from "node:child_process";
import { e2eDatabaseUrl } from "./db";

/**
 * Syncs the e2e database schema with prisma/schema.prisma before the run.
 * Non-destructive: if a schema change would lose data this fails, and you recreate the test database.
 */
export default function globalSetup() {
  const url = e2eDatabaseUrl();
  execFileSync("npx", ["prisma", "db", "push"], {
    stdio: "inherit",
    // prisma.config.ts prefers these over DATABASE_URL, so point all of them at the e2e database
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, POSTGRES_URL_NON_POOLING: url, POSTGRES_PRISMA_URL: url },
  });
}
