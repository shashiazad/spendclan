import { expect, test, type Page } from "@playwright/test";
import { USERS, query, resetDb } from "./db";
import { chooseGroupAction, loginAs, openGroup } from "./helpers";

// QA_REPORT G-1, G-2, G-8 and NEW-1: group page mutations must never fail silently.

const settlementCount = async () => Number((await query<{ n: string }>(`SELECT count(*) n FROM "Settlement"`))[0].n);
const expenseCount = async () =>
  Number((await query<{ n: string }>(`SELECT count(*) n FROM "GroupExpense" WHERE "deletedAt" IS NULL`))[0].n);

test.beforeEach(async () => {
  await resetDb();
});

test.describe("record payment", () => {
  test("is prefilled with what you owe and records it", async ({ page }) => {
    await loginAs(page, USERS.alice.email);
    await openGroup(page, "Settlements");

    await expect(page.locator("#pay-to")).toHaveValue(USERS.bob.id);
    await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("400.00");

    await page.getByRole("button", { name: "Record" }).click();
    await expect(page.getByText("Payment recorded")).toBeVisible();
    expect(await query(`SELECT "fromId", "toId", amount FROM "Settlement"`)).toEqual([
      { fromId: USERS.alice.id, toId: USERS.bob.id, amount: 400 },
    ]);
  });

  test("with no debt shows a placeholder and sends nothing until a person is chosen", async ({ page }) => {
    await loginAs(page, USERS.bob.email);
    await openGroup(page, "Settlements");

    const payTo = page.locator("#pay-to");
    await expect(payTo).toHaveValue("");
    await expect(payTo.locator("option:checked")).toHaveText("Select a person");

    let posted = false;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().includes("/settle")) posted = true;
    });
    await page.getByLabel("Amount", { exact: true }).fill("50");
    await page.getByRole("button", { name: "Record" }).click();
    await page.waitForTimeout(500);
    expect(posted).toBe(false);
    expect(await settlementCount()).toBe(0);
  });

  test("a server error is shown and the form is kept", async ({ page }) => {
    await loginAs(page, USERS.alice.email);
    await openGroup(page, "Settlements");
    await page.route("**/api/groups/*/settle", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 500, json: { error: "Something went wrong on our side" } })
        : route.continue(),
    );

    await page.getByRole("button", { name: "Record" }).click();
    // Next.js adds its own role="alert" route announcer, so match ours by text
    await expect(page.getByRole("alert").filter({ hasText: "Something went wrong on our side" })).toBeVisible();
    await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("400.00");
    await expect(page.locator("#pay-to")).toHaveValue(USERS.bob.id);
    expect(await settlementCount()).toBe(0);
  });
});

test.describe("add expense", () => {
  async function fillExpense(page: Page) {
    await page.getByLabel("Amount", { exact: true }).fill("300");
    await page.getByLabel("Description").fill("Scooter rental");
  }

  test("a network failure is shown and everything typed is kept", async ({ page }) => {
    await loginAs(page, USERS.alice.email);
    await openGroup(page);
    await page.route("**/api/groups/*/expenses", (route) =>
      route.request().method() === "POST" ? route.abort("internetdisconnected") : route.continue(),
    );

    await fillExpense(page);
    await page.getByRole("button", { name: "Add Expense", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Couldn't reach the server" })).toBeVisible();
    await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("300");
    await expect(page.getByLabel("Description")).toHaveValue("Scooter rental");
    expect(await expenseCount()).toBe(1);
  });

  test("a double tap creates only one expense", async ({ page }) => {
    await loginAs(page, USERS.alice.email);
    await openGroup(page);
    let posts = 0;
    // Slow the request down so the second tap lands while the first is still in flight
    await page.route("**/api/groups/*/expenses", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      posts++;
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });

    await fillExpense(page);
    const submit = page.getByRole("button", { name: "Add Expense", exact: true });
    await submit.dblclick();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Expense added")).toBeVisible();

    expect(posts).toBe(1);
    expect(await expenseCount()).toBe(2);
    await expect(page.getByLabel("Description")).toHaveValue("");
  });
});

test("a failed delete keeps the expense and says why", async ({ page }) => {
  await loginAs(page, USERS.bob.email);
  await openGroup(page);
  await page.route("**/api/groups/*/expenses?id=*", (route) =>
    route.request().method() === "DELETE"
      ? route.fulfill({ status: 500, json: { error: "Something went wrong on our side" } })
      : route.continue(),
  );

  await page.getByRole("button", { name: "Delete Hotel" }).click();
  await page.getByRole("dialog", { name: "Delete expense?" }).getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Something went wrong on our side")).toBeVisible();
  await expect(page.getByText("Hotel")).toBeVisible();
  expect(await expenseCount()).toBe(1);
});

test("dialogs have an opaque surface", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  await chooseGroupAction(page, "Download report");
  const dialog = page.getByRole("dialog", { name: "Download Pocket Expense Report" });
  await expect(dialog).toBeVisible();
  const background = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor);
  // rgb(...) is opaque; rgba(..., <1) would let the page show through
  expect(background).toMatch(/^rgb\(/);
});
