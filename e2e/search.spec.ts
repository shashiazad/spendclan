import { expect, test, type Page } from "@playwright/test";
import { GROUP_ID, USERS, query, resetDb } from "./db";
import { loginAs, openGroup, settleAfterEach } from "./helpers";

// Expense search: tokens, filters, URL sync, sorting, pagination, the all-groups page and access control.

const FLAT = "10000000-0000-4000-8000-000000000002";
const TAXI = "30000000-0000-4000-8000-000000000011";
const FLIGHT = "30000000-0000-4000-8000-000000000012";
const RENT = "30000000-0000-4000-8000-000000000013";

async function addExpense(id: string, groupId: string, description: string, amount: number, paidBy: string, shares: [string, number][], when: string) {
  await query(
    `INSERT INTO "GroupExpense"(id, amount, description, date, "splitType", "paidById", "groupId", "createdById", "updatedAt")
     VALUES ($1, $2, $3, ${when}, 'EQUAL', $4, $5, $4, now())`,
    [id, amount, description, paidBy, groupId],
  );
  for (const [user, share] of shares) {
    await query(`INSERT INTO "GroupSplit"(id, amount, "groupExpenseId", "userId") VALUES (gen_random_uuid(), $1, $2, $3)`, [share, id, user]);
  }
}

settleAfterEach();

test.beforeEach(async () => {
  await resetDb(); // Goa Trip: Hotel ₹1,200 paid by Bob, split 3 ways
  const { alice, bob } = USERS;
  await addExpense(TAXI, GROUP_ID, "Taxi to airport", 90, alice.id, [[alice.id, 45], [bob.id, 45]], "now() - interval '1 day'");
  await addExpense(FLIGHT, GROUP_ID, "Flight tickets", 1000, alice.id, [[alice.id, 500], [bob.id, 500]], "now() - interval '40 days'");
  // A second group that Carol is not in
  await query(`INSERT INTO "Group"(id, name, "updatedAt") VALUES ($1, 'Flat 4B', now())`, [FLAT]);
  await query(
    `INSERT INTO "GroupMember"(id, role, "userId", "groupId") VALUES (gen_random_uuid(), 'ADMIN', $1, $3), (gen_random_uuid(), 'MEMBER', $2, $3)`,
    [alice.id, bob.id, FLAT],
  );
  await addExpense(RENT, FLAT, "Rent October", 3000, bob.id, [[alice.id, 1500], [bob.id, 1500]], "now() - interval '2 days'");
});

const search = (page: Page) => page.getByRole("searchbox", { name: "Search expenses" });
const summary = (page: Page) => page.getByText(/^\d+ expenses? · /);
// The description of each row, in display order
const rows = (page: Page) => page.locator("section[aria-labelledby^='month-'] li span[title]");

test("tokens become filters, results are counted, and the URL keeps them", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);

  await search(page).fill("paid:me ");
  await expect(page.getByRole("button", { name: "Remove filter: Paid by You" })).toBeVisible();
  await expect(search(page)).toHaveValue("");
  await expect(summary(page)).toHaveText("2 expenses · ₹1,090.00");
  await expect(page.getByText("Hotel")).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`paidBy=${USERS.alice.id}`));

  // Amount range from tokens, with Enter
  await search(page).fill(">500 <1100");
  await search(page).press("Enter");
  await expect(summary(page)).toHaveText("1 expense · ₹1,000.00");
  await expect(page.getByText("Flight tickets")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove filter: ₹500.01 – ₹1099.99" })).toBeVisible();

  // Survives a reload
  await page.reload();
  await expect(summary(page)).toHaveText("1 expense · ₹1,000.00");
  await expect(page.getByRole("button", { name: "Remove filter: Paid by You" })).toBeVisible();

  // Removing chips widens the search again; Clear all returns to the full list
  await page.getByRole("button", { name: "Remove filter: Paid by You" }).click();
  await expect(summary(page)).toHaveText("1 expense · ₹1,000.00");
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByText("Hotel")).toBeVisible();
  await expect(summary(page)).toHaveCount(0); // the plain month list, not search results
});

test("free text matches descriptions and people, and highlights the match", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  await search(page).fill("bob");
  await expect(summary(page)).toHaveText("3 expenses · ₹2,290.00"); // Bob paid or shares all three
  await search(page).fill("tick");
  await expect(summary(page)).toHaveText("1 expense · ₹1,000.00");
  await expect(page.locator("mark", { hasText: "tick" })).toBeVisible();
});

test("typo-tolerant matching finds a misspelt description", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await page.goto(`/groups/${GROUP_ID}?q=hotle`);
  await expect(page.getByText("No expenses match “hotle”.")).toBeVisible();
  await page.goto(`/groups/${GROUP_ID}?q=hotle&match=fuzzy`);
  await expect(summary(page)).toHaveText("1 expense · ₹1,200.00");
  await expect(page.getByText("Hotel")).toBeVisible();
});

test("sorting by amount orders the results", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  await page.getByRole("combobox", { name: "Sort expenses" }).selectOption("amount_asc");
  await expect(summary(page)).toHaveText("3 expenses · ₹2,290.00");
  await expect(rows(page)).toHaveText(["Taxi to airport", "Flight tickets", "Hotel"]);
  await expect(page).toHaveURL(/sort=amount_asc/);
});

test("filters: a bottom sheet on phones, an inline panel on desktop", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  await page.getByRole("button", { name: /^Filters/ }).click();

  const phone = (page.viewportSize()?.width ?? 0) < 768;
  if (phone) {
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await sheet.getByRole("group", { name: "Paid by" }).getByText("Bob").click();
    await sheet.getByRole("group", { name: "Split type" }).getByText("Equal").click();
    await expect(page.getByText("Hotel")).toBeVisible(); // nothing applied until Apply
    await sheet.getByRole("button", { name: "Apply" }).click();
    await expect(sheet).toHaveCount(0);
  } else {
    await expect(page.getByRole("button", { name: /^Filters/ })).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("group", { name: "Paid by" }).getByText("Bob").click();
  }
  await expect(summary(page)).toHaveText("1 expense · ₹1,200.00");
  await expect(page.getByRole("button", { name: /^Filters/ })).toContainText(phone ? "2" : "1");
});

test("date presets filter by expense date", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  await search(page).fill("date:last30 ");
  await expect(page.getByRole("button", { name: "Remove filter: Last 30 days" })).toBeVisible();
  await expect(summary(page)).toHaveText("2 expenses · ₹1,290.00"); // the 40-day-old flight is out
});

test("/ focuses the search box", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  await page.locator("body").press("/");
  await expect(search(page)).toBeFocused();
});

test("the all-groups page searches every group you are in", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await page.goto("/expenses");
  await expect(summary(page)).toHaveText("4 expenses · ₹5,290.00");
  await expect(page.getByRole("link", { name: "Flat 4B" })).toBeVisible();

  await search(page).fill("group:flat ");
  await expect(summary(page)).toHaveText("1 expense · ₹3,000.00");
  await expect(page.getByText("Rent October")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`group=${FLAT}`));
});

test("results load in pages without repeats", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  const api = page.context().request;
  const seen: string[] = [];
  let cursor: string | null = null;
  do {
    const res = await api.get(`/api/expenses?limit=1&sort=amount_desc${cursor ? `&cursor=${cursor}` : ""}`);
    expect(res.ok()).toBe(true);
    const body: { totalCount: number; totalAmountMinor: number; items: { description: string }[]; nextCursor: string | null } = await res.json();
    expect(body.totalCount).toBe(4);
    expect(body.totalAmountMinor).toBe(529000);
    seen.push(...body.items.map((i) => i.description));
    cursor = body.nextCursor;
  } while (cursor);
  expect(seen).toEqual(["Rent October", "Hotel", "Flight tickets", "Taxi to airport"]);
});

test("the API validates its input", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  const api = page.context().request;
  for (const qs of ["limit=51", "amount=abc", "paidBy=nope", "from=2026-10-05&to=2026-10-01", "cursor=garbage", `q=${"x".repeat(101)}`]) {
    expect((await api.get(`/api/expenses?${qs}`)).status(), qs).toBe(400);
  }
  // A plain listing on the group endpoint keeps its old shape
  const plain = await (await api.get(`/api/groups/${GROUP_ID}/expenses`)).json();
  expect(plain.expenses).toHaveLength(3);
});

test("search never reaches groups you aren't an active member of", async ({ page }) => {
  await loginAs(page, USERS.carol.email);
  const api = page.context().request;

  // Asking for another group's expenses by id returns nothing
  const filtered = await (await api.get(`/api/expenses?groupId=${FLAT}`)).json();
  expect(filtered.totalCount).toBe(0);
  const all = await (await api.get(`/api/expenses?q=rent`)).json();
  expect(all.totalCount).toBe(0);
  // The group's own endpoint refuses outright
  expect((await api.get(`/api/groups/${FLAT}/expenses?q=rent`)).ok()).toBe(false);

  // Once removed from Goa Trip, Carol no longer finds its expenses
  await query(`UPDATE "GroupMember" SET "removedAt" = now() WHERE "userId" = $1`, [USERS.carol.id]);
  expect((await (await api.get(`/api/expenses?q=hotel`)).json()).totalCount).toBe(0);
  expect((await api.get(`/api/groups/${GROUP_ID}/expenses?q=hotel`)).ok()).toBe(false);
});

test("deleted expenses are visible only to whoever added them and group admins", async ({ page }) => {
  await query(`UPDATE "GroupExpense" SET "deletedAt" = now(), "deletedById" = $1 WHERE description = 'Hotel'`, [USERS.bob.id]);
  const deletedCount = async (email: string) => {
    await loginAs(page, email);
    return (await (await page.context().request.get(`/api/groups/${GROUP_ID}/expenses?status=deleted`)).json()).totalCount;
  };
  expect(await deletedCount(USERS.bob.email)).toBe(1); // paid it (legacy row: payer is the owner)
  expect(await deletedCount(USERS.alice.email)).toBe(1); // group admin
  expect(await deletedCount(USERS.carol.email)).toBe(0);
});
