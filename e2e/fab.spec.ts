import { expect, test } from "@playwright/test";
import { GROUP_ID, USERS, query, resetDb } from "./db";
import { count, loginAs, openGroup, settleAfterEach } from "./helpers";

// The floating + adds a group expense: straight into the current group, or via a group picker.

settleAfterEach();

test.beforeEach(async () => {
  await resetDb();
});

const fab = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Add group expense" });

test("on a group page, + opens the add form for that group and the list updates", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  await fab(page).click();

  const dialog = page.getByRole("dialog", { name: "Add expense" });
  await expect(dialog.getByText("In Goa Trip")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Change group" })).toHaveCount(0);
  await expect(dialog.getByLabel("Amount", { exact: true })).toBeFocused();

  await dialog.getByLabel("Amount", { exact: true }).fill("90");
  await dialog.getByLabel("Description").fill("Coffee");
  await dialog.getByRole("button", { name: "Add Expense", exact: true }).click();

  await expect(page.getByText("Expense added to Goa Trip")).toBeVisible();
  await expect(dialog).toHaveCount(0);
  // The group page refreshes without a reload
  await expect(page.getByText("Coffee")).toBeVisible();
  expect(await count(`SELECT count(*) n FROM "GroupExpense" WHERE description = 'Coffee' AND "createdById" = $1`, [USERS.alice.id])).toBe(1);
});

test("elsewhere, + asks which group first and the group can be changed", async ({ page }) => {
  await query(`INSERT INTO "Group"(id, name, "updatedAt") VALUES ('10000000-0000-4000-8000-000000000002', 'Flat 4B', now())`);
  await query(
    `INSERT INTO "GroupMember"(id, role, "userId", "groupId") VALUES (gen_random_uuid(), 'ADMIN', $1, '10000000-0000-4000-8000-000000000002')`,
    [USERS.alice.id],
  );

  await loginAs(page, USERS.alice.email);
  await page.goto("/dashboard");
  await fab(page).click();

  const dialog = page.getByRole("dialog", { name: "Add expense" });
  await expect(dialog.getByText("Which group is this expense for?")).toBeVisible();
  await dialog.getByRole("button", { name: /Flat 4B/ }).click();
  await expect(dialog.getByText("In Flat 4B")).toBeVisible();

  await dialog.getByRole("button", { name: "Change group" }).click();
  await dialog.getByRole("button", { name: /Goa Trip\s*3 members/ }).click();
  await expect(dialog.getByText("In Goa Trip")).toBeVisible();
  await expect(dialog.getByRole("checkbox", { name: "Carol" })).toBeChecked();

  await dialog.getByLabel("Amount", { exact: true }).fill("120");
  await dialog.getByLabel("Description").fill("Snacks");
  await dialog.getByRole("button", { name: "Add Expense", exact: true }).click();
  await expect(page.getByText("Expense added to Goa Trip")).toBeVisible();
  expect(await count(`SELECT count(*) n FROM "GroupExpense" WHERE description = 'Snacks' AND "groupId" = $1`, [GROUP_ID])).toBe(1);
});

test("an empty group offers to add the first expense", async ({ page }) => {
  await query(`UPDATE "GroupExpense" SET "deletedAt" = now()`);
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  await expect(page.getByText("No expenses yet")).toBeVisible();
  await page.getByRole("button", { name: "Add the first expense" }).click();
  await expect(page.getByRole("dialog", { name: "Add expense" }).getByText("In Goa Trip")).toBeVisible();
});

test("someone with no groups is pointed to create one", async ({ page }) => {
  await query(`UPDATE "GroupMember" SET "removedAt" = now() WHERE "userId" = $1`, [USERS.carol.id]);
  await loginAs(page, USERS.carol.email);
  await page.goto("/dashboard");
  await fab(page).click();
  const dialog = page.getByRole("dialog", { name: "Add expense" });
  await expect(dialog.getByText("You aren't in any groups yet.", { exact: false })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Go to groups" })).toBeVisible();
});
