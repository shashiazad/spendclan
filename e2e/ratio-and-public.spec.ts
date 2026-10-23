import { expect, test } from "@playwright/test";
import { GROUP_ID, USERS, query, resetDb } from "./db";
import { loginAs, openAddExpense, openGroup, settleAfterEach } from "./helpers";

settleAfterEach();
test.beforeEach(resetDb);

test.describe("ratio split", () => {
  test("splits by parts, keeps the parts and shows them when editing", async ({ page }) => {
    await loginAs(page, USERS.alice.email);
    await openGroup(page);
    const dialog = await openAddExpense(page);
    await dialog.getByLabel("Amount", { exact: true }).fill("1200");
    await dialog.getByLabel("Description").fill("Villa");
    await dialog.getByRole("radio", { name: "By ratio" }).click();

    // Empty parts count as 1; give Alice 2 parts
    await expect(dialog.getByText("3 parts · ₹400.00 per part")).toBeVisible();
    await dialog.getByLabel("Alice's parts").fill("2");
    await expect(dialog.getByText("4 parts · ₹300.00 per part")).toBeVisible();
    await expect(dialog.getByText("parts · ₹600.00")).toBeVisible();

    // A zero part blocks saving with a reason
    await dialog.getByLabel("Bob's parts").fill("0");
    await expect(dialog.getByText("Give everyone in the split a part greater than 0.")).toBeVisible();
    await dialog.getByLabel("Bob's parts").fill("1");

    await dialog.getByRole("button", { name: "Add Expense", exact: true }).click();
    await expect(page.getByText("Expense added to Goa Trip")).toBeVisible();

    const rows = await query<{ name: string; amount: number; ratio: number }>(
      `SELECT u.name, s.amount, s.ratio FROM "GroupSplit" s JOIN "GroupExpense" e ON e.id = s."groupExpenseId" JOIN "User" u ON u.id = s."userId"
       WHERE e.description = 'Villa' AND e."splitType" = 'RATIO' ORDER BY u.name`,
    );
    expect(rows).toEqual([
      { name: "Alice", amount: 600, ratio: 2 },
      { name: "Bob", amount: 300, ratio: 1 },
      { name: "Carol", amount: 300, ratio: 1 },
    ]);

    // The list says how it was split, and the details show the parts
    const toggle = page.getByRole("button", { name: "By ratio · 3 people" });
    await toggle.click();
    await expect(page.getByText("You (paid) · 2 parts")).toBeVisible();

    // Editing brings the ratio back
    await page.getByRole("button", { name: "Edit Villa" }).click();
    const edit = page.getByRole("dialog", { name: "Edit expense" });
    await expect(edit.getByRole("radio", { name: "By ratio" })).toHaveAttribute("aria-checked", "true");
    await expect(edit.getByLabel("Alice's parts")).toHaveValue("2");
    await expect(edit.getByLabel("Bob's parts")).toHaveValue("1");
  });

  test("the API rejects a ratio split with a missing part", async ({ page }) => {
    await loginAs(page, USERS.alice.email);
    const res = await page.context().request.post(`/api/groups/${GROUP_ID}/expenses`, {
      data: {
        amount: 100,
        description: "x",
        date: "2026-10-01",
        splitType: "RATIO",
        paidById: USERS.alice.id,
        splits: [{ userId: USERS.alice.id, ratio: 1 }, { userId: USERS.bob.id }],
      },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/part greater than 0/);
  });

  test("search can filter ratio splits", async ({ page }) => {
    await query(`UPDATE "GroupExpense" SET "splitType" = 'RATIO'`);
    await loginAs(page, USERS.alice.email);
    const body = await (await page.context().request.get(`/api/groups/${GROUP_ID}/expenses?splitType=RATIO`)).json();
    expect(body.totalCount).toBe(1);
  });
});

test.describe("public pages", () => {
  test("signed in: no sign-in or sign-up offers, and auth pages go to your groups", async ({ page }) => {
    await loginAs(page, USERS.alice.email);
    await page.goto("/about");
    const nav = page.locator("nav").first();
    await expect(nav.getByRole("link", { name: "Open SpendClan" })).toBeVisible();
    await expect(nav.getByRole("link", { name: /sign in|get started/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /create a free account/i })).toHaveCount(0);

    for (const path of ["/login", "/register", "/"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/groups$/);
    }
  });

  test("signed out: About offers sign in and sign up", async ({ page }) => {
    await page.goto("/about");
    const nav = page.locator("nav").first();
    await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Get started" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Shared costs");
    await expect(page.getByText("**")).toHaveCount(0);
  });

  test("Google is only offered when it's configured, and a failed Google sign-in explains itself", async ({ page }) => {
    // The test server runs without Google credentials
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /google/i })).toHaveCount(0);
    await page.goto("/register");
    await expect(page.getByRole("button", { name: /google/i })).toHaveCount(0);
    const providers = await (await page.request.get("/api/auth/providers")).json();
    expect(Object.keys(providers)).toEqual(["credentials"]);

    await page.goto("/login?error=OAuthCallback");
    await expect(page.getByRole("alert").filter({ hasText: "Google sign-in didn't complete" })).toBeVisible();
  });
});
