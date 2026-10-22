import { expect, test } from "@playwright/test";
import { GROUP_ID, USERS, query, resetDb } from "./db";
import { chooseGroupAction, count, loginAs, openAddExpense, openGroup, settleAfterEach } from "./helpers";

// QA_REPORT P1: permissions, edit/undo, split editor, dialogs, settle-up, header menu, chart.

const HOTEL = "30000000-0000-4000-8000-000000000001";

settleAfterEach();

test.beforeEach(async () => {
  await resetDb();
});

test.describe("expense permissions (only the person who added it)", () => {
  test("others see no Edit/Delete and the API refuses them", async ({ page }) => {
    await loginAs(page, USERS.alice.email);
    await openGroup(page);
    await expect(page.getByText("Hotel")).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Hotel" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete Hotel" })).toHaveCount(0);

    const api = page.context().request;
    const del = await api.delete(`/api/groups/${GROUP_ID}/expenses?id=${HOTEL}`);
    expect(del.status()).toBe(403);
    const edit = await api.patch(`/api/groups/${GROUP_ID}/expenses?id=${HOTEL}`, {
      data: { amount: 1, description: "x", date: new Date().toISOString(), splitType: "EQUAL", paidById: USERS.alice.id },
    });
    expect(edit.status()).toBe(403);
    expect(await count(`SELECT count(*) n FROM "GroupExpense" WHERE id = $1 AND "deletedAt" IS NULL AND amount = 1200`, [HOTEL])).toBe(1);
  });

  test("the creator can edit; the previous version is kept", async ({ page }) => {
    await loginAs(page, USERS.bob.email);
    await openGroup(page);
    await page.getByRole("button", { name: "Edit Hotel" }).click();

    const dialog = page.getByRole("dialog", { name: "Edit expense" });
    await expect(dialog.getByLabel("Amount", { exact: true })).toBeFocused();
    await dialog.getByLabel("Amount", { exact: true }).fill("1500");
    await dialog.getByRole("checkbox", { name: "Carol" }).uncheck();
    await expect(dialog.getByText("Not involved")).toBeVisible();
    await dialog.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Expense updated")).toBeVisible();
    await expect(dialog).toHaveCount(0);
    const splits = await query<{ userId: string; amount: number }>(
      `SELECT "userId", amount FROM "GroupSplit" WHERE "groupExpenseId" = $1 ORDER BY amount, "userId"`,
      [HOTEL],
    );
    expect(splits).toEqual([
      { userId: USERS.alice.id, amount: 750 },
      { userId: USERS.bob.id, amount: 750 },
    ]);
    const [revision] = await query<{ snapshot: { amount: number; splits: unknown[] } }>(
      `SELECT snapshot FROM "GroupExpenseRevision" WHERE "groupExpenseId" = $1`,
      [HOTEL],
    );
    expect(revision.snapshot.amount).toBe(1200);
    expect(revision.snapshot.splits).toHaveLength(3);
  });

  test("delete asks first, then Undo restores it", async ({ page }) => {
    await loginAs(page, USERS.bob.email);
    await openGroup(page);
    await page.getByRole("button", { name: "Delete Hotel" }).click();

    const confirm = page.getByRole("dialog", { name: "Delete expense?" });
    await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
    await confirm.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText('Deleted "Hotel"')).toBeVisible();
    expect(await count(`SELECT count(*) n FROM "GroupExpense" WHERE "deletedAt" IS NOT NULL`)).toBe(1);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Expense restored")).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Hotel" })).toBeVisible();
    expect(await count(`SELECT count(*) n FROM "GroupExpense" WHERE "deletedAt" IS NULL`)).toBe(1);
  });
});

test.describe("split editor", () => {
  test("equal split among selected people only", async ({ page }) => {
    await loginAs(page, USERS.alice.email);
    await openGroup(page);
    await openAddExpense(page);
    await page.getByLabel("Amount", { exact: true }).fill("300");
    await page.getByLabel("Description").fill("Taxi");
    await page.getByRole("checkbox", { name: "Carol" }).uncheck();
    await expect(page.getByText("₹150.00 each · 2 people")).toBeVisible();
    await page.getByRole("button", { name: "Add Expense", exact: true }).click();
    await expect(page.getByText("Expense added")).toBeVisible();

    const splits = await query<{ userId: string; amount: number }>(
      `SELECT s."userId", s.amount FROM "GroupSplit" s JOIN "GroupExpense" e ON e.id = s."groupExpenseId"
       WHERE e.description = 'Taxi' ORDER BY s."userId"`,
    );
    expect(splits).toEqual([
      { userId: USERS.alice.id, amount: 150 },
      { userId: USERS.bob.id, amount: 150 },
    ]);
    expect(await count(`SELECT count(*) n FROM "GroupExpense" WHERE description = 'Taxi' AND "createdById" = $1`, [USERS.alice.id])).toBe(1);
  });

  test("exact amounts show what's left and say why submit is disabled", async ({ page }) => {
    await loginAs(page, USERS.alice.email);
    await openGroup(page);
    await openAddExpense(page);
    await page.getByLabel("Amount", { exact: true }).fill("300");
    await page.getByLabel("Description").fill("Groceries");
    await page.getByRole("radio", { name: "Exact amounts" }).click();

    const submit = page.getByRole("button", { name: "Add Expense", exact: true });
    await page.getByLabel("Alice's share").fill("100");
    await expect(page.getByText("Allocated ₹100.00 of ₹300.00 · Remaining ₹200.00")).toBeVisible();
    await expect(submit).toBeDisabled();
    await expect(page.getByText("Allocate ₹200.00 more.")).toBeVisible();

    await page.getByLabel("Bob's share").fill("50");
    await page.getByRole("button", { name: "Give the remaining ₹150.00 to Carol" }).click();
    await expect(page.getByLabel("Carol's share")).toHaveValue("150.00");
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByText("Expense added")).toBeVisible();
    expect(await count(`SELECT count(*) n FROM "GroupExpense" WHERE description = 'Groceries'`)).toBe(1);
  });
});

test.describe("dialogs", () => {
  test("focus moves in, stays in, and returns to the menu button", async ({ page }) => {
    await loginAs(page, USERS.alice.email);
    await openGroup(page);
    await chooseGroupAction(page, "Download report");

    const dialog = page.getByRole("dialog", { name: "Download Pocket Expense Report" });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Group actions" })).toBeFocused();
  });

  test("the floating add button is hidden while a dialog is open", async ({ page }) => {
    await loginAs(page, USERS.alice.email);
    await openGroup(page);
    const fab = page.getByRole("button", { name: "Quick add expense" });
    await expect(fab).toBeVisible();
    await chooseGroupAction(page, "Download report");
    await expect(fab).toBeHidden();
  });
});

test("deleting a group needs its name typed in Group settings", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  await chooseGroupAction(page, "Group settings");
  await page.getByRole("dialog", { name: "Group settings" }).getByRole("button", { name: "Delete group…" }).click();

  const confirm = page.getByRole("dialog", { name: "Delete this group?" });
  const confirmButton = confirm.getByRole("button", { name: "Delete group" });
  await expect(confirmButton).toBeDisabled();
  await confirm.getByLabel('Type "Goa Trip" to confirm').fill("Goa");
  await expect(confirmButton).toBeDisabled();
  await confirm.getByLabel('Type "Goa Trip" to confirm').fill("Goa Trip");
  await confirmButton.click();

  await page.waitForURL("**/groups");
  expect(await count(`SELECT count(*) n FROM "Group" WHERE id = $1 AND "deletedAt" IS NOT NULL`, [GROUP_ID])).toBe(1);
});

test("only admins see Group settings", async ({ page }) => {
  await loginAs(page, USERS.bob.email);
  await openGroup(page);
  await page.getByRole("button", { name: "Group actions" }).click();
  await expect(page.getByRole("menuitem", { name: "Add member" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Group settings" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("Settle up on a debt prefills the payment and warns on overpaying", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page, "Balances");
  await page.getByRole("button", { name: "Settle up" }).click();

  await expect(page.locator("#pay-to")).toHaveValue(USERS.bob.id);
  const amount = page.getByLabel("Amount", { exact: true });
  await expect(amount).toHaveValue("400.00");
  await amount.fill("500");
  await expect(page.getByText("That's ₹100.00 more than you owe Bob.")).toBeVisible();
  await page.getByRole("button", { name: "Full amount (₹400.00)" }).click();
  await expect(amount).toHaveValue("400.00");
  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByText("Payment recorded")).toBeVisible();
  expect(await count(`SELECT count(*) n FROM "Settlement" WHERE amount = 400`)).toBe(1);
});

test("the dashboard chart labels all six months", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await page.goto("/dashboard");
  const ticks = page.locator(".recharts-cartesian-axis-tick-value");
  await ticks.first().scrollIntoViewIfNeeded();
  // X-axis labels are month names; Y-axis labels are numbers
  await expect
    .poll(async () => (await ticks.allTextContents()).filter((t) => /^[A-Z][a-z]{2}$/.test(t)))
    .toHaveLength(6);
});
