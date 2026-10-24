// Applies database migrations during deploy.
//
// - Fresh database, or one already managed by migrations: `prisma migrate deploy`.
// - Existing database created with `prisma db push` (no _prisma_migrations table): one-time move to
//   migrations. It brings the schema up to date with the same non-destructive `db push` the build
//   used before (it fails rather than lose data), then records every migration as applied.
//
// Never resets, drops or deletes anything.
//
// On Vercel, only production deployments migrate. Preview builds share the same database env, so
// letting every branch deploy touch the schema could change production data before a merge.
// Set FORCE_DB_MIGRATE=1 to migrate on a preview anyway.

import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import "dotenv/config";

if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production" && process.env.FORCE_DB_MIGRATE !== "1") {
  console.log(`[db-migrate] Skipping migrations on a ${process.env.VERCEL_ENV} deployment.`);
  process.exit(0);
}

// Same precedence as prisma.config.ts
const url =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;

if (!url) {
  console.error("[db-migrate] No database URL configured.");
  process.exit(1);
}

const prisma = (...args) => execFileSync("npx", ["prisma", ...args], { stdio: "inherit", env: process.env });

const client = new pg.Client({ connectionString: url });
await client.connect();
let state;
try {
  const { rows } = await client.query(
    `SELECT to_regclass('"_prisma_migrations"') IS NOT NULL AS migrated, to_regclass('"User"') IS NOT NULL AS has_tables`,
  );
  state = rows[0];

  if (!state.migrated && state.has_tables) {
    // The schema's trigram index needs the extension before db push can create it
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  }
} finally {
  await client.end();
}

if (state.migrated || !state.has_tables) {
  prisma("migrate", "deploy");
} else {
  console.log("[db-migrate] Database was created with db push; moving it to migrations (one time).");
  prisma("db", "push");
  const dir = path.join(process.cwd(), "prisma", "migrations");
  const migrations = readdirSync(dir)
    .filter((name) => statSync(path.join(dir, name)).isDirectory())
    .sort(); // timestamp-prefixed, the same order Prisma applies them in
  for (const name of migrations) prisma("migrate", "resolve", "--applied", name);
  // Confirms nothing is pending and the history is consistent
  prisma("migrate", "deploy");
}
