import { expect, test } from "@playwright/test";
import { GROUP_ID, USERS, resetDb } from "./db";
import { loginAs, settleAfterEach } from "./helpers";

// Screenshot comparisons of the bento tiles. Opt-in (VISUAL=1) because baselines depend on the
// OS's font rendering: regenerate with `VISUAL=1 npx playwright test e2e/visual.spec.ts --update-snapshots`.

test.skip(!process.env.VISUAL, "visual baselines are opt-in: set VISUAL=1");
settleAfterEach();

for (const theme of ["dark", "light"] as const) {
  test(`bento tiles, ${theme}`, async ({ page }, info) => {
    test.skip(info.project.name !== "chromium-desktop");
    await resetDb();
    await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await loginAs(page, USERS.alice.email);

    await page.goto("/groups");
    await page.waitForLoadState("networkidle");
    // Times and "Active … ago" change on every run
    const mask = [page.locator("time"), page.getByText(/^Active .* ago$/)];
    for (const tile of ["Net balance", "Quick actions", "Your groups", "Who owes whom", "This month by group"]) {
      await expect(page.getByRole("region", { name: tile })).toHaveScreenshot(`home-${tile.toLowerCase().replace(/\s+/g, "-")}-${theme}.png`, {
        animations: "disabled",
        mask,
        maxDiffPixelRatio: 0.01,
      });
    }

    await page.goto(`/groups/${GROUP_ID}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("region", { name: "Your balance" })).toHaveScreenshot(`group-balance-${theme}.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
}
