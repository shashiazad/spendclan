import { expect, test, type Page } from "@playwright/test";
import { USERS, query, resetDb } from "./db";
import { count, loginAs, settleAfterEach } from "./helpers";

// The main journey at phone, tablet and desktop widths in both themes:
// create a group → add expenses choosing who paid → search by payer, amount, date and text →
// filters (sheet on phones, panel on desktop) → settle up.

settleAfterEach();

const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];

const summary = (page: Page) => page.getByText(/^\d+ expenses? · /);
const search = (page: Page) => page.getByRole("searchbox", { name: "Search expenses" });

for (const theme of ["dark", "light"] as const) {
  for (const vp of VIEWPORTS) {
    test(`journey @${vp.name}px, ${theme}`, async ({ page }, info) => {
      // One browser is enough: this test sizes the viewport itself
      test.skip(info.project.name !== "chromium-desktop");
      test.setTimeout(90_000);
      await resetDb();
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAs(page, USERS.alice.email);

      // Create a group with Bob
      const name = `Cabin ${vp.name} ${theme}`;
      await page.goto("/groups");
      await page.getByRole("button", { name: "Create Group", exact: true }).click();
      const create = page.getByRole("dialog", { name: "Create Group" });
      await create.getByLabel("Name").fill(name);
      await create.getByRole("textbox", { name: "Search people to add" }).fill("Bob");
      await create.getByRole("button", { name: /Bob/ }).first().click();
      await create.getByRole("button", { name: "Create", exact: true }).click();
      await expect(create).toHaveCount(0);

      await page.getByRole("region", { name: "Your groups" }).getByRole("link", { name: new RegExp(`^${name}`) }).click();
      await expect(page.getByRole("heading", { name })).toBeVisible();

      // Add two expenses, choosing who paid
      await page.getByRole("button", { name: "Add the first expense" }).click();
      let dialog = page.getByRole("dialog", { name: "Add expense" });
      await dialog.getByLabel("Amount", { exact: true }).fill("900");
      await dialog.getByLabel("Description").fill("Cabin booking");
      await dialog.getByRole("group", { name: "Paid by" }).getByText("Bob", { exact: true }).click();
      await dialog.getByRole("button", { name: "Add Expense", exact: true }).click();
      await expect(page.getByText(`Expense added to ${name}`)).toBeVisible();

      await page.getByRole("button", { name: "New expense" }).click();
      dialog = page.getByRole("dialog", { name: "Add expense" });
      await dialog.getByLabel("Amount", { exact: true }).fill("120");
      await dialog.getByLabel("Description").fill("Snacks");
      await expect(dialog.getByRole("radio", { name: "You (Alice)" })).toBeChecked();
      await dialog.getByRole("button", { name: "Add Expense", exact: true }).click();
      await expect(dialog).toHaveCount(0);

      // Search by payer, amount, date and description
      await search(page).fill("paid:bob ");
      await expect(summary(page)).toHaveText("1 expense · ₹900.00");
      await page.getByRole("button", { name: "Clear all" }).click();

      await search(page).fill(">500");
      await search(page).press("Enter");
      await expect(summary(page)).toHaveText("1 expense · ₹900.00");
      await page.getByRole("button", { name: "Clear all" }).click();

      await search(page).fill("date:today ");
      await expect(summary(page)).toHaveText("2 expenses · ₹1,020.00");
      await page.getByRole("button", { name: "Clear all" }).click();

      await search(page).fill("snack");
      await expect(summary(page)).toHaveText("1 expense · ₹120.00");
      await page.getByRole("button", { name: "Clear all" }).click();

      // Filters: bottom sheet on phones, inline panel from 768px
      await page.getByRole("button", { name: /^Filters/ }).click();
      if (vp.width < 768) {
        const sheet = page.getByRole("dialog", { name: "Filters" });
        await sheet.getByRole("group", { name: "Paid by" }).getByText("Bob", { exact: true }).click();
        await sheet.getByRole("button", { name: "Apply" }).click();
      } else {
        await page.getByRole("group", { name: "Paid by" }).getByText("Bob", { exact: true }).click();
      }
      await expect(summary(page)).toHaveText("1 expense · ₹900.00");
      await page.getByRole("button", { name: "Clear all" }).click();

      // Settle up: Alice owes Bob 450 − 60 = 390
      await page.getByRole("group", { name: "Group sections" }).getByRole("button", { name: "Balances", exact: true }).click();
      await page.getByRole("button", { name: "Settle up" }).click();
      await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("390.00");
      await page.getByRole("button", { name: "Record", exact: true }).click();
      await expect(page.getByText("Payment recorded")).toBeVisible();
      await page.getByRole("group", { name: "Group sections" }).getByRole("button", { name: "Balances", exact: true }).click();
      await expect(page.getByText("All settled up!")).toBeVisible();

      const [{ id }] = await query<{ id: string }>(`SELECT id FROM "Group" WHERE name = $1`, [name]);
      expect(await count(`SELECT count(*) n FROM "Settlement" WHERE "groupId" = $1 AND amount = 390`, [id])).toBe(1);
    });
  }
}
