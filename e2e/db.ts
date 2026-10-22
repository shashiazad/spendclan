import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { parse } from "dotenv";
import { Client } from "pg";

export const USERS = {
  alice: { id: "00000000-0000-4000-8000-00000000000a", name: "Alice", email: "alice@e2e.local" },
  bob: { id: "00000000-0000-4000-8000-00000000000b", name: "Bob", email: "bob@e2e.local" },
  carol: { id: "00000000-0000-4000-8000-00000000000c", name: "Carol", email: "carol@e2e.local" },
} as const;
// Generated per run (no credential in source). Tests both seed and log in with it, and
// resetDb() re-hashes it before every test, so any value works. Override with E2E_USER_PASSWORD.
export const PASSWORD = process.env.E2E_USER_PASSWORD ?? randomBytes(18).toString("base64url");
export const GROUP_ID = "10000000-0000-4000-8000-000000000001";

/**
 * The e2e database is wiped before every test, so only accept a local,
 * explicitly configured database that is not the one the app normally uses.
 */
export function e2eDatabaseUrl(): string {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) {
    throw new Error("Set E2E_DATABASE_URL to a disposable local Postgres database. It is wiped on every test.");
  }
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`Refusing to wipe a non-local database (host "${host}").`);
  }
  const appUrl = existsSync(".env") ? parse(readFileSync(".env")).DATABASE_URL : undefined;
  if (url === appUrl || url === process.env.DATABASE_URL) {
    throw new Error("E2E_DATABASE_URL must not be the app's DATABASE_URL.");
  }
  return url;
}

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: e2eDatabaseUrl() });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows as T[];
  } finally {
    await client.end();
  }
}

/**
 * Resets to a known state: Alice, Bob and Carol share "Goa Trip".
 * Bob paid ₹1,200 for the hotel split equally, so Alice and Carol each owe Bob ₹400.
 */
export async function resetDb() {
  const hash = bcrypt.hashSync(PASSWORD, 4);
  const { alice, bob, carol } = USERS;
  await query(`TRUNCATE "User", "Group", "GroupMember", "GroupExpense", "GroupSplit", "Settlement", "GroupInvitation" CASCADE`);
  await query(
    `INSERT INTO "User"(id, name, email, "mobileNumber", "hashedPassword", "emailVerified", "updatedAt") VALUES
     ($1, $2, $3, '9000000001', $10, true, now()),
     ($4, $5, $6, '9000000002', $10, true, now()),
     ($7, $8, $9, '9000000003', $10, true, now())`,
    [alice.id, alice.name, alice.email, bob.id, bob.name, bob.email, carol.id, carol.name, carol.email, hash],
  );
  await query(`INSERT INTO "Group"(id, name, "updatedAt") VALUES ($1, 'Goa Trip', now())`, [GROUP_ID]);
  await query(
    `INSERT INTO "GroupMember"(id, role, "userId", "groupId") VALUES
     (gen_random_uuid(), 'ADMIN', $1, $4), (gen_random_uuid(), 'MEMBER', $2, $4), (gen_random_uuid(), 'MEMBER', $3, $4)`,
    [alice.id, bob.id, carol.id, GROUP_ID],
  );
  await query(
    `INSERT INTO "GroupExpense"(id, amount, description, date, "splitType", "paidById", "groupId", "updatedAt")
     VALUES ('30000000-0000-4000-8000-000000000001', 1200, 'Hotel', now(), 'EQUAL', $1, $2, now())`,
    [bob.id, GROUP_ID],
  );
  await query(
    `INSERT INTO "GroupSplit"(id, amount, "groupExpenseId", "userId") VALUES
     (gen_random_uuid(), 400, '30000000-0000-4000-8000-000000000001', $1),
     (gen_random_uuid(), 400, '30000000-0000-4000-8000-000000000001', $2),
     (gen_random_uuid(), 400, '30000000-0000-4000-8000-000000000001', $3)`,
    [alice.id, bob.id, carol.id],
  );
}
