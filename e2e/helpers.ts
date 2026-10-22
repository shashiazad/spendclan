import { expect, test, type Page } from "@playwright/test";
import { GROUP_ID, PASSWORD, query } from "./db";

export async function loginAs(page: Page, email: string) {
  const request = page.context().request;
  const { csrfToken } = await (await request.get("/api/auth/csrf")).json();
  await request.post("/api/auth/callback/credentials", {
    form: { csrfToken, identifier: email, password: PASSWORD, json: "true" },
  });
}

export async function openGroup(page: Page, tab?: "Balances" | "Settlements") {
  await page.goto(`/groups/${GROUP_ID}`);
  await expect(page.getByRole("heading", { name: "Goa Trip" })).toBeVisible();
  if (tab) await page.getByRole("button", { name: tab, exact: true }).click();
}

/** The add form is collapsed when the group already has expenses. */
export async function openAddExpense(page: Page) {
  await page.getByRole("button", { name: "New expense" }).click();
  await expect(page.getByRole("heading", { name: "Add an expense" })).toBeVisible();
}

export async function chooseGroupAction(page: Page, item: string) {
  await page.getByRole("button", { name: "Group actions" }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

export const count = async (sql: string, params: unknown[] = []) =>
  Number((await query<{ n: string }>(sql, params))[0].n);

/**
 * Let the page finish its background requests (e.g. the refresh after a save) before the
 * next test resets the database; otherwise a request can read rows that were just truncated.
 */
export function settleAfterEach() {
  test.afterEach(async ({ page }) => {
    await page.waitForLoadState("networkidle").catch(() => {});
  });
}
