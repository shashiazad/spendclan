import { execFileSync } from "node:child_process";
import { e2eDatabaseUrl } from "./db";

/**
 * Brings the e2e database up to date with the same script the deploy uses (migrations, or the
 * one-time move from db push). Non-destructive: on a conflict this fails and you recreate the test database.
 */
export default function globalSetup() {
  const url = e2eDatabaseUrl();
  execFileSync("node", ["scripts/db-migrate.mjs"], {
    stdio: "inherit",
    // prisma.config.ts prefers these over DATABASE_URL, so point all of them at the e2e database
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, POSTGRES_URL_NON_POOLING: url, POSTGRES_PRISMA_URL: url },
  });
}
