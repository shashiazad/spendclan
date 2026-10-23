# SpendClan QA Report

Tracks every finding from `FIX_AND_ENHANCEMENT_PROMPT.md`, plus new ones found while reproducing them.

## How findings were verified (2026-10-22)

- **Environment:** local `next dev` against a disposable Postgres with seeded test users. No production data was used.
- **Browsers:** Playwright Chromium and **Playwright WebKit** (Safari's engine) at 320, 390 and 1280px, dark theme. Each finding was measured (element boxes, computed styles, network status, DB rows), not judged by eye.
- **Not covered yet:** real Safari on macOS and iOS (URL bar, safe-area insets, input zoom, cookie persistence, PWA install, blob downloads), Firefox, Android Chrome, the light theme, and screen readers.

**Status values:** CONFIRMED · NOT REPRODUCED · NOT TESTED (needs a manual or device check) · CODE (verified by reading the code).
**Fix values:** FIXED (with a regression test where noted) · OPEN.

## Regression tests

78 tests, each run on Chromium mobile, Chromium desktop and WebKit mobile:

- `e2e/group-mutations.spec.ts` (P0) covers G-1, G-2, G-8, NEW-1 and NEW-2. All of them fail against the code before the P0 fix.
- `e2e/fab.spec.ts` covers the floating + as the group-expense button: on a group page it opens that group's form; elsewhere it shows a group picker with "Change group"; the empty-group and no-groups states; and the page refreshing after an add.
- `e2e/expense-list.spec.ts` covers month grouping and order, month totals, "you lent / borrowed / not involved", search, the split toggle and the summary tiles.
- `e2e/group-p1.spec.ts` (P1) covers creator-only edit and delete (API and UI), edit with revision history, delete with Undo, equal split among selected people, the exact-amount editor, dialog focus, the FAB hidden under dialogs, the typed-name group delete, admin-only settings, Settle up with the overpay warning, and all six chart months.

```bash
# Use a disposable local database. It is cleared before every test.
docker run -d --name spendclan-e2e-db -e POSTGRES_PASSWORD=test -e POSTGRES_DB=spendclan_e2e -p 55433:5432 postgres:16-alpine
npx playwright install chromium webkit
E2E_DATABASE_URL=postgresql://postgres:test@localhost:55433/spendclan_e2e npm run test:e2e
```

The suite refuses to run if `E2E_DATABASE_URL` is missing, not on localhost, or the same as the app's `DATABASE_URL`.

---

## A1. Group detail — `src/app/(dashboard)/groups/[id]/page.tsx`

| ID | Sev | Status | Evidence (engine @ width) | Root cause | Fix |
|---|---|---|---|---|---|
| G-1 | P0 | CONFIRMED | Chromium @390: a failed payment POST (400) cleared the form, showed nothing and saved nothing | Mutations ignored `res.ok` | **FIXED** (P0): every mutation goes through `runMutation`; failures show an inline error or toast and keep input. Tested |
| G-2 | P0 | CODE | No pending or disabled state on any submit | — | **FIXED** (P0): one request at a time (ref guard) plus `loading` buttons. A double tap plus Enter sends 1 request. Tested. The server-side `Idempotency-Key` is still OPEN (ENHANCEMENT Phase 0) |
| G-3 | P1 | CONFIRMED | Both engines @320/390: Download Report, Add Member and Delete Pocket wrap to 3 lines (46px), with Delete next to Add Member | `page.tsx:605` | **FIXED** (P1): one ⋯ “Group actions” menu (Add member, Download report, Group settings). Delete moved to Group settings → Danger zone, behind a typed-name confirmation. Tested |
| G-4 | P1 | CONFIRMED | FAB covers Paid By @390 and Date @320; bottom nav covers Paid By when scrolled @320 | `QuickAddFAB.tsx:69`, no content padding | **FIXED** (P1): the FAB hides while a field has focus and while scrolling down; scroll padding keeps focused fields clear of the header and bottom nav; content padding includes the safe area |
| G-5 | P1 | CONFIRMED | Custom split shows only "Split totals mismatch…"; no remaining amount | Validation block in `page.tsx` | **FIXED** (P1): live “Allocated X of Y · Remaining Z”, Split evenly, Reset, “Give the remaining … to {name}”, and the exact reason the submit button is disabled. Tested |
| G-6 | P1 | CONFIRMED | A ₹197 custom expense shows two ₹0.00 rows | `page.tsx:710`; server requires all members (`expenses/route.ts:55`) | **FIXED** (P1): include/exclude checkboxes, Select all/none, “Not involved” rows. The server accepts a subset of members and stores no zero-amount splits; existing ₹0 rows are hidden. Tested |
| G-7 | P1 | CONFIRMED | Native `confirm()` at `page.tsx:228,348,430`. `alert()` removed in P0 | — | **FIXED on the group page** (P1): `ConfirmDialog` replaces `confirm()`, and expense delete gets an Undo toast (restore endpoint). Tested. The personal pages still use `confirm()` (expenses, income, savings, recurring), tracked under D-5 |
| G-8 | P1→**P0** | CONFIRMED | "Pay To" showed Bob but the form value was `""`; Record sent `toId: ""` and got a 400, silently | `Select` without a placeholder, so the display didn't match state | **FIXED** (P0 + P1): prefilled from your debt, “Settle up” on each of your debt rows, a Full-amount button, and an overpay or no-debt warning. Tested. Payment date, method, note and receiver confirmation need new backend fields (Part B) |
| G-9 | P2 | CONFIRMED | Both engines show `₹-298.50` | `formatCurrency` (`constants.ts:78`) puts the sign after the symbol | **FIXED** (Phase 4): one fixed-locale formatter per currency, `-₹298.50`. Unit-tested |
| G-10 | P2 | CODE | Members live in the Settlements tab (`page.tsx:809`) | — | **FIXED** (Phase 3): Members tab |
| G-11 | P2 | CONFIRMED | "Pocket Detail Panel" (`page.tsx:528`) | — | **FIXED** (Phase 1): "Group" everywhere |
| G-12 | P2 | NOT TESTED | Desktop column width not measured | — | **FIXED** (Phase 3): bento layout uses the desktop width |
| G-13 | P2 | CODE | `type="number"` and native date at `page.tsx:635,637,658,787` | — | **FIXED** (Phase 4): amounts are text inputs with a decimal keypad that accept `1,200.50` / `₹1,200` |
| G-14 | P2 | CODE | Uses the viewer's currency (`page.tsx:86`); server errors hard-code `$` (`expenses/route.ts:79-81`) | — | Partly fixed (Phase 4): server split errors no longer hard-code `$`. Per-group currency still OPEN (needs `Group.currency`) |
| G-15 | P2 | CODE | No edit, restore, search, filter or pagination | — | **FIXED** (Phase 2): server-side search, filters and cursor pagination |
| G-16 | P3 | CODE | Equal-split remainder goes to the payer (`expenses/route.ts:32`) | — | **FIXED**: every expense shows “you lent / you borrowed / not involved / just for you”. Tested. A rounding-rule hint is OPEN |
| G-17 | P3 | CODE | `<img>` avatars (`page.tsx:820`; lint warns) | — | **FIXED** (Phase 3): shared `Avatar` component (photos are small data URLs; `<img>` is intentional) |

## A2. Global shell / navigation

| ID | Sev | Status | Evidence | Root cause | Fix |
|---|---|---|---|---|---|
| N-1 | P1 | CONFIRMED | Both engines: FAB and bottom nav stay undimmed above an open dialog | Overlay, FAB and Modal all use `z-50` (`Modal.tsx:48`, `QuickAddFAB.tsx:69`) | **FIXED** (P1): layering tokens (nav 40, FAB 45, dropdown 50, overlay 60, modal 70, toast 80) used everywhere; the FAB is hidden while a dialog is open. Tested |
| N-2 | P1 | CONFIRMED | On open, focus stays outside the dialog (WebKit: `BODY`); Tab moves focus out of it | `Modal.tsx` only handles Escape (`:32`) | **FIXED** (P1): focus moves into the dialog (`data-autofocus` or the first field), Tab and Shift+Tab cycle inside it (handled by the dialog itself, because Safari's Tab skips buttons), and focus returns to the opener. Unique title ids. Tested in WebKit too |
| N-3 | P2 | CONFIRMED | 1 unlabeled icon button on mobile (the prompt said 2) | Header icon button | **FIXED** (P1): the drawer close button is labelled “Close menu” |
| N-4 | P2 | CONFIRMED | Under 40px @390: 26 of 36 controls on the group page, 17 of 24 on the dashboard | — | **FIXED** (Phases 3–4): 44px targets on phones; axe and Lighthouse pass |
| N-5 | P2 | CONFIRMED | Text under 11px @390: 27 nodes on the group page, 59 on the dashboard | — | **FIXED** (Phase 4): no text below 12px; Lighthouse "legible font sizes" passes |
| N-6 | P2 | CONFIRMED | Group page: 3 inputs with no `autocomplete` or `inputmode`. Register: mobile number and security answer have no `autocomplete`. All inputs are 14px, so iOS will zoom into them | — | **FIXED** (Phase 4): `autocomplete`/`inputmode` on auth, profile and amount fields; inputs are 16px on phones |
| N-7 | P2 | CONFIRMED | Viewport tag is `width=device-width, initial-scale=1` | `layout.tsx` viewport export | **FIXED** (P1): `viewportFit: "cover"` plus `env(safe-area-inset-*)` on the bottom nav, FAB and content. Still needs a real-iPhone check |
| N-8 | P3 | NOT TESTED | — | — | **FIXED** (Phase 3): Admin is only shown to admins; others are redirected to Groups |
| N-9 | P3 | NOT TESTED | — | — | **FIXED** (Phase 4): one `PageHeader` (h1, eyebrow ≥12px) on every page |
| N-10 | P3 | NOT TESTED | — | — | **FIXED** (Phase 3): More menu on the phone bar lists Profile, Advisor, About, Admin |

## A3. Dashboard / personal finance

> **Retired (2026-10-23):** the dashboard and personal pages were removed in the group-only refocus, so D-1…D-5 no longer apply. D-5 (`confirm()` on personal pages) is closed with them.

| ID | Sev | Status | Evidence | Root cause | Fix |
|---|---|---|---|---|---|
| D-1 | P1 | CONFIRMED | @390 the axis shows May, Jun, Jul, Aug, Oct (no Sep); @1280 all 6 months appear | The data has 6 months (`dashboard.ts`). Recharts' default `interval="preserveEnd"` hides labels that don't fit (`dashboard/page.tsx` XAxis) | **FIXED** (P1): `interval={0}` and short `MMM` labels (the tooltip keeps the year). Tested |
| D-2 | P2 | NOT TESTED | Test data was not empty | — | Obsolete (dashboard retired) |
| D-3 | P2 | NOT TESTED | — | — | Obsolete (dashboard retired) |
| D-4 | P2 | CONFIRMED | Same as N-4/N-5 on the dashboard | — | Obsolete (dashboard retired) |
| D-5 | P3 | NOT TESTED | — | — | Obsolete (personal pages retired) |

## A4. Auth screens

| ID | Sev | Status | Evidence | Fix |
|---|---|---|---|---|
| U-1 | P2 | NOT TESTED | — | OPEN: two-step register and removing the security question not done |
| U-2 | P2 | CONFIRMED | Register inputs are 38px tall at 14px | **FIXED** (Phase 3): inputs are 44px / 16px on phones |
| U-3 | P2 | NOT TESTED | — | **FIXED** (Phase 4): no page-level fade-ins; reduced motion respected |
| U-4 | P3 | NOT TESTED | The logo looked soft in screenshots but wasn't measured | **FIXED** (Phase 4): the 970 KB logo is served as 64/192/512px images |
| U-5 | P1 | NOT TESTED | Needs a session-persistence test (ENHANCEMENT Phase 2) | **FIXED** (Phase 4): 90-day sliding JWT session never re-checked against the DB (rotating refresh tokens not added) |

## A5. Manual checks

| Item | Status |
|---|---|
| Double submit | **FIXED and tested** (G-2) |
| Failed-request handling on the group page | **FIXED and tested** (G-1) |
| Delete keeps data | Verified earlier against a seeded DB: groups, expenses, settlements and members are soft-deleted, and the database blocks hard deletes |
| Remove a member while their balance ≠ 0 | Verified earlier: the debt stays in balances under their name |
| Everything else in A5 (PDF content, Google linking, verification and reset emails, AI states, expired-session redirect) | NOT TESTED |

## New findings

| ID | Sev | Status | Evidence | Root cause | Fix |
|---|---|---|---|---|---|
| NEW-1 | P0 | CONFIRMED | G-1 and G-8 combined: a payment "recorded" without changing Pay To was silently dropped | See G-1, G-8 | **FIXED and tested** |
| NEW-2 | P1 | CONFIRMED | Both engines: the form behind showed through the dialog's text | `--card` is 40% opaque in dark mode (`globals.css`); Modal, MemberSearch dropdown, Select options and Toast used it | **FIXED and tested**: new `--surface-solid` token (both themes) for layers over content |
| NEW-3 | P2 | CODE | `colorScheme: "dark"` is forced even in the light theme | `layout.tsx:14` | **FIXED** (Phase 3): follows the system, `color-scheme` per theme |
| NEW-4 | P2 | CODE | Trend months bucket by the server's timezone (UTC on Vercel); IST entries before 05:30 on the 1st land in the previous month | `dashboard.ts:108` | Obsolete (dashboard retired) |
| NEW-5 | P2 | CODE | Digit grouping follows the browser locale (₹1,02,815 vs ₹102,815). WebKit's `Intl` `en-IN` output is correct (`-₹1,02,815.50`), so a shared formatter is safe | `constants.ts:78` | **FIXED** (Phase 4, with G-9) |
| NEW-6 | P3 | CODE | A zero balance renders green, as if money were owed | `page.tsx:750` (`>= 0`) | **FIXED** (Phase 3): zero balances are neutral |
| NEW-7 | P1 | CODE | Every member sees Delete on every expense, and the API allows it | Group page plus `expenses/route.ts` DELETE | **FIXED** (P1): only the person who added an expense can edit, delete or restore it (`src/lib/group-permissions.ts`, enforced by the API and reflected in the UI). Legacy rows without a creator fall back to the payer. Tested |
| NEW-8 | P2 | CODE | Toasts were not announced to screen readers | `Toast.tsx` | **FIXED**: container is `role="status"` `aria-live="polite"` |
| NEW-9 | P1 | CONFIRMED | The groups list said "All settled up" for every group: `GET /api/groups` never returned `userBalance` | `api/groups/route.ts` | **FIXED** (group-only Phase 1): the API returns the caller's balance per group (paid − own shares + settlements sent − received, active rows only). Tested |
| NEW-10 | P1 | CODE | `db-security` treated a `groupId` filter like `{ in: [...] }` as one id: membership in any one listed group passed the check, and an empty list threw "Access Denied" | `db-security.ts` | **FIXED**: only a plain string id gets the direct membership check; other shapes fall back to the per-row "active member" filter. Tested (no-groups case) |
| NEW-11 | P2 | CONFIRMED | With the light theme saved, Next's dev overlay reports 1 issue on every page (likely the theme class hydration mismatch, related to NEW-3) | `layout.tsx` theme init | **FIXED** (Phase 3) |

## Safari / WebKit (Part D)

| Check | Result |
|---|---|
| `backdrop-filter` / `-webkit-backdrop-filter` | Both supported in Playwright WebKit |
| `dvh`, `:has()` | Supported |
| `Intl` INR formatting | Correct (`-₹1,02,815.50`) |
| Dialog focus | Broken; same as N-2, focus stays on `BODY` |
| Input zoom (<16px) | All inputs are 14px, so iOS will zoom into them (predicted, not seen on a device) |
| Fixed bar behind the URL bar, safe area, ITP cookies, PWA install, blob PDF download | NOT TESTED; needs a real iPhone or BrowserStack |

## Changelog

- **Group-only Phase 4 (2026-10-23): carry-over fixes, tests and quality gates.**
  - *Fixes:* money formatting (G-9/NEW-5), decimal amount inputs (G-13), currency-neutral split errors, autocomplete/inputmode (N-6), one page header (N-9), no text under 12px (N-5), no page fade-ins (U-3), resized logo (U-4: pages went from 1.2–1.4 MB to ~260–450 KB), 90-day sliding sessions (U-5), heading order on Expenses/Activity, dark-mode accent split into a text colour (≥4.5:1) and a solid fill for white text, server-rendered first paint for Home, Balances and the group page (no full-page spinner).
  - *Unit tests (Vitest, 78):* split math and rounding, balances and debt simplification, money formatting, search filter builder, token parser, URL filters.
  - *E2E (Playwright, 171 runs):* everything before plus the main journey at 375/768/1440 × light/dark (create group → add expenses with Paid by → search by payer/amount/date/text → filter sheet or panel → settle up), axe-core on every screen and dialog in both themes (0 serious/critical), and opt-in visual baselines for the bento tiles (`VISUAL=1`).
  - *Lighthouse (mobile, production build):* performance 91–97, accessibility 100, best practices 100, SEO 100, CLS 0, TBT ≤ 10 ms on login, Home, a group, Expenses, Balances and Activity. With DevTools throttling every page scores 100 with LCP 1.5 s; Lighthouse's simulated slow-4G estimate puts LCP at 2.6–3.5 s, above the 2.5 s target. INP can't be measured in the lab; TBT is the proxy.
  - *Still open:* U-1 (two-step register, drop the security question), G-14 (per-group currency), rotating refresh tokens.
- **Group-only Phase 3 (2026-10-23): Bento + minimal + micro-glass redesign.**
  - *Tokens:* canvas `#F8FAFC` / `#0B0F19`, minimal solid cards, glass only on interactive layers (nav bars, More menu, toasts, segmented control, chips, quick actions) with a solid fallback where `backdrop-filter` is unsupported, an accent gradient for primary actions, money colours always paired with a sign, ambient mesh that drifts only without reduced motion. All hard-coded slate/zinc/red/emerald classes replaced with tokens (fixes unreadable light-mode text on Profile and auth pages).
  - *Theme:* follows the system until a choice is saved; no longer forced dark (**NEW-3 fixed**); no hydration warning from the theme class (**NEW-11 fixed**).
  - *Navigation:* floating glass bottom bar on phones (Groups, Expenses, Balances, Activity, More), icon rail on tablets, sidebar on desktop; content centred with a max width; 44px targets and 16px inputs on phones.
  - *Screens:* bento Home (net balance hero, quick actions, your groups, who owes whom, recent activity, spend by group this month); new Balances and Activity pages; bento group page with a Members tab and group activity under Balances; `?settle=` / `?invite=` deep links. New read-only `GET /api/home` and `GET /api/activity` (from existing timestamps).
  - *Deliberate deviations:* dialogs and dropdowns stay opaque (readability; covered by a test). "Remind" and "Pending confirmations" are hidden until those features exist.
  - *Verified:* 141 e2e (3 browsers), 62 unit; screenshots at 375/768/1440 in light and dark.
- **Group-only Phase 2 (2026-10-23):**
  - *2a Paid by:* the payer select is now `PaidByRadioGroup` (native radios as avatar cards, "You" first and default, arrow keys, 44px targets, 2 columns from 4 members on phones). Editing an expense whose payer left shows them checked and disabled as "(removed)"; the API now lets an edit keep a former payer or split member (new expenses still need current members).
  - *2b Search:* one search bar for a group's Expenses tab and a new all-groups **Expenses** page (`/expenses`, in the nav). Free text over description and people (contains / starts with / typo-tolerant via `pg_trgm`), amount (exact, ≈±5%, min/max, `₹1,200.50` accepted), paid by, split with, added by, date presets/custom range (expense date or added on), split type, status (active / edited / deleted — deleted only for the owner or a group admin), group (all-groups page), and six sorts. Tokens in the box (`paid:`, `with:`, `by:`, `group:`, `>500`, `<=1200`, `=`, `~`, `amount:a-b`, `date:2026-10|last30|a..b`, `type:`, `is:`) become removable chips. Filters live in the URL, `/` focuses search, result count and total are announced, skeleton loading, "Clear filters", infinite scroll with a Load more fallback, recent and saved searches on the device. Phones get a bottom sheet with Apply/Reset; desktop an inline panel.
  - *API:* `GET /api/groups/[id]/expenses` with any search param, and `GET /api/expenses` — Zod-validated (bounded lists, text and page size), keyset cursor pagination (≤50), `{ items, nextCursor, totalCount, totalAmountMinor }`, limited to groups where the caller is an active member, 120 searches/min per user (in-memory, per instance). The group endpoint without params keeps its old response.
  - *Database:* moved from `db push` to Prisma migrations (`scripts/db-migrate.mjs`: one-time baseline for existing databases, `migrate deploy` otherwise) and added `pg_trgm` plus five indexes. On 200k expenses / 600k splits (one group with 50k), p95 is 3–33 ms for every filter and 81 ms for typo-tolerant search (capped at the 500 closest matches); target was < 300 ms. The newest-first index is `(groupId, date DESC, id DESC)` rather than including `deletedAt`, because Postgres can't use the index order after an `IS NULL` column.
  - *Tests:* Vitest (62 unit tests: filter builder, token parser, URL filters); 36 new e2e tests across 3 browsers including IDOR, validation, pagination and the phone sheet (141 e2e in total).
  - *Not done:* accent-insensitive matching (needs `unaccent`), notes/category and Shares/Adjustment/Itemized filters (fields don't exist yet), multiple payers.
- **Group-only Phase 1 (2026-10-23):** retired personal finance. Removed the dashboard and the personal expenses, income, recurring and savings pages and APIs; `/dashboard` and `/personal/*` redirect (308) to `/groups`; `/api/personal/*` and `/api/reports/personal` return 410. No tables, columns or rows were dropped: the five personal models are marked deprecated and users can download their data from Profile (`GET /api/users/me/export`, JSON or per-dataset CSV with formula-safe cells). Navigation is Groups · AI Advisor · About (· Admin), with Groups · Advisor · Profile · Menu on phones. "Pocket" renamed to "Group" everywhere. The AI Advisor now uses group data only (balances, settle-up suggestions, spend per group and month, matching group expenses) instead of personal finance and embeddings. The all-groups monthly PDF report moved from the dashboard to a "Download report" button on the Groups page. Removed `recharts`, `@google/genai`, `lib/dashboard.ts`, `savings-sync.ts`, `delete-null-users.js` and the embeddings script. Fixed NEW-9 and NEW-10. New e2e tests ×3 browsers: redirects, 410s, navigation, export and its isolation, balances unchanged, group-list balances, all-groups report (96 passing in total).
- **Floating + adds group expenses (2026-10-22):** the + button and the group page's "New expense" open one shared "Add expense" dialog (`AddExpenseProvider`). On a group page it targets that group; elsewhere it first asks which group. The previous personal quick-add was removed; personal expenses were later retired (group-only Phase 1).
- **Expenses tab redesign (2026-10-22):** expenses grouped by month (newest first) with sticky month headers showing spend, count and your share; rows with a date tile, payer, and what the expense means for you; collapsible split details; search; summary tiles (group spend, this month, your balance); the Add form is collapsed behind "New expense". The test harness now waits for network idle after each test, fixing a reset race that logged spurious server errors.
- **P1 (2026-10-22):** fixed G-3, G-4, G-5, G-6, G-7 (group page), G-8 (UI), N-1, N-2, N-3, N-7, D-1 and NEW-7; added expense edit with revision history (`GroupExpenseRevision`), Undo for deletes, and new `DropdownMenu`, `ConfirmDialog` and `ExpenseForm` components. Schema change is additive only (`GroupExpense.createdById`, `updatedById`, and the new `GroupExpenseRevision` table).
- **P0 (2026-10-22):** fixed G-1, G-2 (client side), G-8, NEW-1, NEW-2 and NEW-8; replaced `alert()` with toasts on the group page; data now refreshes without the full-page spinner after a change; added the Playwright e2e suite.

## Deferred

Server-side idempotency keys and integer money (ENHANCEMENT Phase 0). Everything marked OPEN above, by priority.
