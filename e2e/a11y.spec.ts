import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { GROUP_ID, USERS, resetDb } from "./db";
import { loginAs, settleAfterEach } from "./helpers";

// Automated accessibility check (axe-core, WCAG 2.2 A/AA): no serious or critical violations,
// in both themes, on every main screen and the main dialogs.

settleAfterEach();
test.beforeEach(resetDb);

async function audit(page: Page, label: string) {
  await page.waitForLoadState("networkidle");
  // Let entrance animations (fades, slide-ups) finish so colours are measured at full opacity
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude("nextjs-portal") // the Next.js dev tools badge
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `${label}\n${summary.join("\n")}`).toEqual([]);
}

for (const theme of ["dark", "light"] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    });

    test("sign-in pages", async ({ page }) => {
      for (const path of ["/login", "/register", "/forgot-password"]) {
        await page.goto(path);
        await audit(page, path);
      }
    });

    test("main screens", async ({ page }) => {
      await loginAs(page, USERS.alice.email);
      for (const path of ["/groups", "/expenses", "/balances", "/activity", "/profile", "/advisor"]) {
        await page.goto(path);
        await audit(page, path);
      }
    });

    test("group page, every section", async ({ page }) => {
      await loginAs(page, USERS.alice.email);
      await page.goto(`/groups/${GROUP_ID}`);
      await audit(page, "group: expenses");
      for (const section of ["Balances", "Settlements", "Members"]) {
        await page.getByRole("group", { name: "Group sections" }).getByRole("button", { name: section, exact: true }).click();
        await audit(page, `group: ${section}`);
      }
    });

    test("dialogs and search results", async ({ page }) => {
      await loginAs(page, USERS.alice.email);
      await page.goto(`/groups/${GROUP_ID}?q=hot`);
      await page.getByText(/^\d+ expenses? · /).waitFor();
      await audit(page, "search results");

      await page.getByRole("button", { name: "New expense" }).click();
      await page.getByRole("dialog", { name: "Add expense" }).getByLabel("Amount", { exact: true }).waitFor();
      await audit(page, "add expense dialog");
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: /^Filters/ }).click();
      await audit(page, "filters");
    });
  });
}
