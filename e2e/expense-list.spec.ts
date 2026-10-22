import { expect, test } from "@playwright/test";
import { format, subMonths } from "date-fns";
import { GROUP_ID, USERS, query, resetDb } from "./db";
import { loginAs, openGroup, settleAfterEach } from "./helpers";

// Expenses tab: month-wise grouping, per-row "what it means for you", search and split details.

settleAfterEach();

test.beforeEach(async () => {
  await resetDb();
  // A second expense in the previous month: Alice paid ₹1,000 split with Bob
  await query(
    `INSERT INTO "GroupExpense"(id, amount, description, date, "splitType", "paidById", "groupId", "createdById", "updatedAt")
     VALUES ('30000000-0000-4000-8000-000000000002', 1000, 'Flight', date_trunc('month', now()) - interval '10 days', 'EQUAL', $1, $2, $1, now())`,
    [USERS.alice.id, GROUP_ID],
  );
  await query(
    `INSERT INTO "GroupSplit"(id, amount, "groupExpenseId", "userId") VALUES
     (gen_random_uuid(), 500, '30000000-0000-4000-8000-000000000002', $1),
     (gen_random_uuid(), 500, '30000000-0000-4000-8000-000000000002', $2)`,
    [USERS.alice.id, USERS.bob.id],
  );
});

const thisMonth = format(new Date(), "MMMM yyyy");
const lastMonth = format(subMonths(new Date(), 1), "MMMM yyyy");

test("expenses are grouped by month, newest first, with month totals", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);

  const months = page.locator("section[aria-labelledby^='month-'] h3");
  await expect(months).toHaveText([thisMonth, lastMonth]);

  const current = page.getByRole("region", { name: thisMonth });
  await expect(current.getByText("₹1,200.00 spent · 1 expense · your share ₹400.00")).toBeVisible();
  await expect(current.getByText("Hotel")).toBeVisible();

  const previous = page.getByRole("region", { name: lastMonth });
  await expect(previous.getByText("₹1,000.00 spent · 1 expense · your share ₹500.00")).toBeVisible();
  await expect(previous.getByText("Flight")).toBeVisible();
});

test("each expense says what it means for you", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  await expect(page.getByText("you borrowed ₹400.00")).toBeVisible(); // Bob paid the hotel
  await expect(page.getByText("you lent ₹500.00")).toBeVisible(); // Alice paid the flight

  await loginAs(page, USERS.carol.email);
  await openGroup(page);
  await expect(page.getByText("not involved")).toBeVisible(); // Carol wasn't on the flight
});

test("search filters the list and the split can be expanded", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);

  const search = page.getByRole("searchbox", { name: "Search expenses" });
  await search.fill("fli");
  await expect(page.getByText("Flight")).toBeVisible();
  await expect(page.getByText("Hotel")).toHaveCount(0);

  await search.fill("zzz");
  await expect(page.getByText("No expenses match “zzz”.")).toBeVisible();

  await search.fill("");
  const toggle = page.getByRole("button", { name: "Split equally · 3 people" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Bob (paid)")).toBeVisible();
});

test("the summary shows group spend, this month and your balance", async ({ page }) => {
  await loginAs(page, USERS.alice.email);
  await openGroup(page);
  await expect(page.getByText("₹2,200.00")).toBeVisible(); // group spend
  // Alice: owes Bob 400 for the hotel, Bob owes Alice 500 for the flight → owed 100
  await expect(page.getByText("You're owed ₹100.00")).toBeVisible();
});
