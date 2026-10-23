import { expect, test } from "@playwright/test";
import { GROUP_ID, USERS, query, resetDb } from "./db";
import { count, loginAs, settleAfterEach } from "./helpers";

// SpendClan is group-only: the personal-finance pages and APIs are retired without losing any data.

settleAfterEach();

async function seedPersonalData() {
  await query(
    `INSERT INTO "PersonalExpense"(id, amount, category, date, "paymentMethod", notes, type, "userId", "updatedAt", embedding) VALUES
     (gen_random_uuid(), 250, 'Groceries', '2026-09-03', 'UPI', '=HYPERLINK("x")', 'DAILY', $1, now(), '{}'),
     (gen_random_uuid(), 1200, 'Rent', '2026-09-01', 'CARD', 'Sept, "half"', 'MONTHLY', $1, now(), '{}')`,
    [USERS.alice.id],
  );
  await query(
    `INSERT INTO "Income"(id, amount, source, date, "userId", "updatedAt") VALUES (gen_random_uuid(), 50000, 'Salary', '2026-09-01', $1, now())`,
    [USERS.alice.id],
  );
}

test.beforeEach(async () => {
  await resetDb();
});

test("old personal pages redirect permanently to the groups Home", async ({ page }) => {
  for (const path of ["/dashboard", "/personal", "/personal/expenses", "/personal/income", "/personal/recurring", "/personal/savings"]) {
    const res = await page.request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(308);
    expect(res.headers()["location"], path).toBe("/groups");
  }

  await loginAs(page, USERS.alice.email);
  await page.goto("/dashboard?from=bookmark");
  await expect(page).toHaveURL(/\/groups\?from=bookmark$/);
});

test("retired personal APIs answer 410 Gone and write nothing", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  const api = page.context().request;
  for (const [method, path] of [
    ["GET", "/api/personal/expenses"],
    ["POST", "/api/personal/expenses"],
    ["DELETE", "/api/personal/income?id=x"],
    ["GET", "/api/personal/savings/goals"],
    ["GET", "/api/personal/dashboard"],
    ["GET", "/api/reports/personal"],
  ] as const) {
    const res = await api.fetch(path, { method, data: method === "POST" ? { amount: 10 } : undefined });
    expect(res.status(), `${method} ${path}`).toBe(410);
    expect((await res.json()).error).toContain("Download your personal data from Profile");
  }
  expect(await count(`SELECT count(*) n FROM "PersonalExpense"`)).toBe(0);
});

test("navigation only offers group features and says Group, never Pocket", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await page.goto("/groups");
  await expect(page.getByRole("heading", { name: "Groups", exact: true })).toBeVisible();

  for (const label of ["Dashboard", "Income", "Recurring", "Savings"]) {
    await expect(page.getByRole("link", { name: label, exact: true })).toHaveCount(0);
  }
  await expect(page.locator('a[href^="/personal"], a[href="/dashboard"]')).toHaveCount(0);
  await expect(page.getByText(/pocket/i)).toHaveCount(0);

  const isPhone = (page.viewportSize()?.width ?? 0) < 1024;
  const nav = page.getByRole("navigation", { name: isPhone ? "Primary" : "Main" });
  await expect(nav.getByRole("link", { name: "Groups" })).toBeVisible();
});

test("personal data can be downloaded as JSON and CSV, and only your own", async ({ page }) => {
  await seedPersonalData();
  await loginAs(page, USERS.alice.email);
  await page.goto("/profile");

  await expect(page.getByRole("heading", { name: "Your personal finance data" })).toBeVisible();
  const csvList = page.getByRole("list", { name: "Download as CSV" });
  await expect(csvList.getByText("Personal expenses (2)")).toBeVisible();
  await expect(csvList.getByText("Income (1)")).toBeVisible();
  await expect(csvList.getByRole("listitem")).toHaveCount(2); // empty datasets are not offered
  await expect(csvList.getByRole("link", { name: "Download Income as CSV" })).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download everything (JSON)" }).click();
  expect((await download).suggestedFilename()).toMatch(/^spendclan-personal-data-\d{4}-\d{2}-\d{2}\.json$/);

  const api = page.context().request;
  const json = await (await api.get("/api/users/me/export?format=json")).json();
  expect(json.expenses).toHaveLength(2);
  expect(json.income[0]).toMatchObject({ amount: 50000, source: "Salary" });
  expect(json.expenses[0]).not.toHaveProperty("embedding");

  const csv = await (await api.get("/api/users/me/export?format=csv&dataset=expenses")).text();
  const [header, ...rows] = csv.trim().split("\r\n");
  expect(header).toBe("id,date,amount,category,type,paymentMethod,notes,createdAt");
  expect(rows[0]).toContain(`"Sept, ""half"""`); // quoted and escaped
  expect(rows[1]).toContain(`"'=HYPERLINK(""x"")"`); // spreadsheet formula neutralised

  expect((await api.get("/api/users/me/export?format=csv&dataset=nope")).status()).toBe(400);

  // Bob sees none of Alice's records
  await loginAs(page, USERS.bob.email);
  const bob = await (await page.context().request.get("/api/users/me/export")).json();
  expect(bob.counts).toEqual({ expenses: 0, income: 0, savings: 0, "savings-goals": 0, recurring: 0 });

  // Exporting never changes the data
  expect(await count(`SELECT count(*) n FROM "PersonalExpense" WHERE "userId" = $1`, [USERS.alice.id])).toBe(2);
});

test("group balances are unchanged by retiring personal finance", async ({ page }) => {
  await seedPersonalData();
  await loginAs(page, USERS.alice.email);
  const res = await page.context().request.get(`/api/groups/${GROUP_ID}/balance`);
  expect(res.ok()).toBe(true);
  const body = await res.json();
  const byName = Object.fromEntries(
    (body.balances as { name: string; balance: number }[]).map((b) => [b.name, b.balance]),
  );
  // Seed: Bob paid the ₹1,200 hotel, split equally three ways
  expect(byName).toEqual({ Alice: -400, Bob: 800, Carol: -400 });
});

test("the groups Home shows your balance in each group", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await page.goto("/groups");
  const goa = page.getByRole("region", { name: "Your groups" }).getByRole("link", { name: /^Goa Trip/ });
  await expect(goa).toContainText("You owe ₹400.00");

  // A settlement and a deleted expense are both reflected
  await query(`INSERT INTO "Settlement"(id, amount, "fromId", "toId", "groupId") VALUES (gen_random_uuid(), 150, $1, $2, $3)`, [
    USERS.alice.id,
    USERS.bob.id,
    GROUP_ID,
  ]);
  await page.reload();
  await expect(goa).toContainText("You owe ₹250.00");

  await loginAs(page, USERS.bob.email);
  await page.goto("/groups");
  await expect(goa).toContainText("You are owed ₹650.00");

  await query(`UPDATE "GroupExpense" SET "deletedAt" = now()`);
  await page.reload();
  await expect(goa).toContainText("You owe ₹150.00"); // only Alice's ₹150 payment remains
});

test("the all-groups monthly report moved from the dashboard to the Groups page", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await page.goto("/groups");
  await page.getByRole("button", { name: "Download report" }).click();
  const dialog = page.getByRole("dialog", { name: "Download all-groups report" });
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download PDF" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await expect(dialog).toHaveCount(0);
});
