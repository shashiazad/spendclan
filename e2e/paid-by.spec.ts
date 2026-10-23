import { expect, test } from "@playwright/test";
import { GROUP_ID, USERS, query, resetDb } from "./db";
import { count, loginAs, openAddExpense, openGroup, settleAfterEach } from "./helpers";

// "Paid by" is a radio group of member cards: defaults to you, keyboard friendly, and edits keep a payer who left.

settleAfterEach();
test.beforeEach(resetDb);

test("the payer defaults to you and can be changed with the keyboard", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  const dialog = await openAddExpense(page);

  const paidBy = dialog.getByRole("group", { name: "Paid by" });
  const radios = paidBy.getByRole("radio");
  await expect(radios).toHaveCount(3);
  await expect(paidBy.getByRole("radio", { name: "You (Alice)" })).toBeChecked();

  // Arrow keys move the selection like any native radio group
  await paidBy.getByRole("radio", { name: "You (Alice)" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(paidBy.getByRole("radio", { name: "Bob" })).toBeChecked();
  await expect(paidBy.getByRole("radio", { name: "You (Alice)" })).not.toBeChecked();

  await dialog.getByLabel("Amount", { exact: true }).fill("90");
  await dialog.getByLabel("Description").fill("Taxi");
  await dialog.getByRole("button", { name: "Add Expense", exact: true }).click();
  await expect(page.getByText("Expense added to Goa Trip")).toBeVisible();
  expect(await count(`SELECT count(*) n FROM "GroupExpense" WHERE description = 'Taxi' AND "paidById" = $1`, [USERS.bob.id])).toBe(1);
});

test("clicking a card selects that payer", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  const dialog = await openAddExpense(page);
  await dialog.getByRole("group", { name: "Paid by" }).getByText("Carol", { exact: true }).click();
  await expect(dialog.getByRole("radio", { name: "Carol" })).toBeChecked();
});

test("editing an expense whose payer left keeps them as a disabled, checked option", async ({ page }) => {
  const DINNER = "30000000-0000-4000-8000-000000000009";
  await query(
    `INSERT INTO "GroupExpense"(id, amount, description, date, "splitType", "paidById", "groupId", "createdById", "updatedAt")
     VALUES ($1, 600, 'Dinner', now(), 'EQUAL', $2, $3, $4, now())`,
    [DINNER, USERS.carol.id, GROUP_ID, USERS.alice.id],
  );
  await query(
    `INSERT INTO "GroupSplit"(id, amount, "groupExpenseId", "userId") VALUES (gen_random_uuid(), 300, $1, $2), (gen_random_uuid(), 300, $1, $3)`,
    [DINNER, USERS.alice.id, USERS.carol.id],
  );
  await query(`UPDATE "GroupMember" SET "removedAt" = now() WHERE "userId" = $1`, [USERS.carol.id]);

  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  await page.getByRole("button", { name: "Edit Dinner" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit expense" });

  const carol = dialog.getByRole("radio", { name: "Carol (removed)" });
  await expect(carol).toBeChecked();
  await expect(carol).toBeDisabled();

  // A small fix saves without touching the payer or the split
  await dialog.getByLabel("Description").fill("Team dinner");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toHaveCount(0);
  expect(
    await count(`SELECT count(*) n FROM "GroupExpense" WHERE id = $1 AND description = 'Team dinner' AND "paidById" = $2`, [DINNER, USERS.carol.id]),
  ).toBe(1);

  // A new expense still can't name someone who left
  const res = await page.context().request.post(`/api/groups/${GROUP_ID}/expenses`, {
    data: { amount: 10, description: "x", date: "2026-10-01", splitType: "EQUAL", paidById: USERS.carol.id },
  });
  expect(res.status()).toBe(400);
});
