# SpendClan QA Report

Tracks every finding from `FIX_AND_ENHANCEMENT_PROMPT.md`, plus new ones found while reproducing them.

## How findings were verified (2026-10-22)

- **Environment:** local `next dev` against a disposable Postgres with seeded test users. No production data was used.
- **Browsers:** Playwright Chromium and **Playwright WebKit** (Safari's engine) at 320, 390 and 1280px, dark theme. Each finding was measured (element boxes, computed styles, network status, DB rows), not judged by eye.
- **Not covered yet:** real Safari on macOS and iOS (URL bar, safe-area insets, input zoom, cookie persistence, PWA install, blob downloads), Firefox, Android Chrome, the light theme, and screen readers.

**Status values:** CONFIRMED · NOT REPRODUCED · NOT TESTED (needs a manual or device check) · CODE (verified by reading the code).
**Fix values:** FIXED (with a regression test where noted) · OPEN.

## Regression tests

`e2e/group-mutations.spec.ts` covers G-1, G-2, G-8, NEW-1 and NEW-2 on Chromium mobile, Chromium desktop and WebKit mobile (21 tests). All of them fail against the code before the P0 fix.

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
| G-3 | P1 | CONFIRMED | Both engines @320/390: Download Report, Add Member and Delete Pocket wrap to 3 lines (46px), with Delete next to Add Member | `page.tsx:605` | OPEN (P1) |
| G-4 | P1 | CONFIRMED | FAB covers Paid By @390 and Date @320; bottom nav covers Paid By when scrolled @320 | `QuickAddFAB.tsx:69`, no content padding | OPEN (P1) |
| G-5 | P1 | CONFIRMED | Custom split shows only "Split totals mismatch…"; no remaining amount | Validation block in `page.tsx` | OPEN (P1) |
| G-6 | P1 | CONFIRMED | A ₹197 custom expense shows two ₹0.00 rows | `page.tsx:710`; server requires all members (`expenses/route.ts:55`) | OPEN (P1) |
| G-7 | P1 | CONFIRMED | Native `confirm()` at `page.tsx:228,348,430`. `alert()` removed in P0 | — | Partly fixed (alerts are now toasts); confirm dialogs OPEN (P1) |
| G-8 | P1→**P0** | CONFIRMED | "Pay To" showed Bob but the form value was `""`; Record sent `toId: ""` and got a 400, silently | `Select` without a placeholder, so the display didn't match state | **FIXED** (P0): placeholder plus `required`, client validation, and prefill from your largest debt to an active member. Tested. The guided flow is OPEN (P1) |
| G-9 | P2 | CONFIRMED | Both engines show `₹-298.50` | `formatCurrency` (`constants.ts:78`) puts the sign after the symbol | OPEN (P2) |
| G-10 | P2 | CODE | Members live in the Settlements tab (`page.tsx:809`) | — | OPEN (P2) |
| G-11 | P2 | CONFIRMED | "Pocket Detail Panel" (`page.tsx:528`) | — | OPEN (P2) |
| G-12 | P2 | NOT TESTED | Desktop column width not measured | — | OPEN |
| G-13 | P2 | CODE | `type="number"` and native date at `page.tsx:635,637,658,787` | — | OPEN (P2) |
| G-14 | P2 | CODE | Uses the viewer's currency (`page.tsx:86`); server errors hard-code `$` (`expenses/route.ts:79-81`) | — | OPEN (P2, needs `Group.currency`) |
| G-15 | P2 | CODE | No edit, restore, search, filter or pagination | — | OPEN (P2) |
| G-16 | P3 | CODE | Equal-split remainder goes to the payer (`expenses/route.ts:32`) | — | OPEN (P3) |
| G-17 | P3 | CODE | `<img>` avatars (`page.tsx:820`; lint warns) | — | OPEN (P3) |

## A2. Global shell / navigation

| ID | Sev | Status | Evidence | Root cause | Fix |
|---|---|---|---|---|---|
| N-1 | P1 | CONFIRMED | Both engines: FAB and bottom nav stay undimmed above an open dialog | Overlay, FAB and Modal all use `z-50` (`Modal.tsx:48`, `QuickAddFAB.tsx:69`) | OPEN (P1) |
| N-2 | P1 | CONFIRMED | On open, focus stays outside the dialog (WebKit: `BODY`); Tab moves focus out of it | `Modal.tsx` only handles Escape (`:32`) | OPEN (P1) |
| N-3 | P2 | CONFIRMED | 1 unlabeled icon button on mobile (the prompt said 2) | Header icon button | OPEN (P2) |
| N-4 | P2 | CONFIRMED | Under 40px @390: 26 of 36 controls on the group page, 17 of 24 on the dashboard | — | OPEN (P2) |
| N-5 | P2 | CONFIRMED | Text under 11px @390: 27 nodes on the group page, 59 on the dashboard | — | OPEN (P2) |
| N-6 | P2 | CONFIRMED | Group page: 3 inputs with no `autocomplete` or `inputmode`. Register: mobile number and security answer have no `autocomplete`. All inputs are 14px, so iOS will zoom into them | — | OPEN (P2) |
| N-7 | P2 | CONFIRMED | Viewport tag is `width=device-width, initial-scale=1` | `layout.tsx` viewport export | OPEN (P1, with safe-area work) |
| N-8 | P3 | NOT TESTED | — | — | OPEN |
| N-9 | P3 | NOT TESTED | — | — | OPEN |
| N-10 | P3 | NOT TESTED | — | — | OPEN |

## A3. Dashboard / personal finance

| ID | Sev | Status | Evidence | Root cause | Fix |
|---|---|---|---|---|---|
| D-1 | P1 | CONFIRMED | @390 the axis shows May, Jun, Jul, Aug, Oct (no Sep); @1280 all 6 months appear | The data has 6 months (`dashboard.ts`). Recharts' default `interval="preserveEnd"` hides labels that don't fit (`dashboard/page.tsx` XAxis) | OPEN (P1): `interval={0}` and short `MMM` labels |
| D-2 | P2 | NOT TESTED | Test data was not empty | — | OPEN |
| D-3 | P2 | NOT TESTED | — | — | OPEN |
| D-4 | P2 | CONFIRMED | Same as N-4/N-5 on the dashboard | — | OPEN (P2) |
| D-5 | P3 | NOT TESTED | — | — | OPEN |

## A4. Auth screens

| ID | Sev | Status | Evidence | Fix |
|---|---|---|---|---|
| U-1 | P2 | NOT TESTED | — | OPEN |
| U-2 | P2 | CONFIRMED | Register inputs are 38px tall at 14px | OPEN (P2) |
| U-3 | P2 | NOT TESTED | — | OPEN |
| U-4 | P3 | NOT TESTED | The logo looked soft in screenshots but wasn't measured | OPEN |
| U-5 | P1 | NOT TESTED | Needs a session-persistence test (ENHANCEMENT Phase 2) | OPEN |

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
| NEW-3 | P2 | CODE | `colorScheme: "dark"` is forced even in the light theme | `layout.tsx:14` | OPEN (P2) |
| NEW-4 | P2 | CODE | Trend months bucket by the server's timezone (UTC on Vercel); IST entries before 05:30 on the 1st land in the previous month | `dashboard.ts:108` | OPEN (P2) |
| NEW-5 | P2 | CODE | Digit grouping follows the browser locale (₹1,02,815 vs ₹102,815). WebKit's `Intl` `en-IN` output is correct (`-₹1,02,815.50`), so a shared formatter is safe | `constants.ts:78` | OPEN (P2, with G-9) |
| NEW-6 | P3 | CODE | A zero balance renders green, as if money were owed | `page.tsx:750` (`>= 0`) | OPEN (P3) |
| NEW-7 | P1 | CODE | Every member sees Delete on every expense, and the API allows it | Group page plus `expenses/route.ts` DELETE | OPEN (P1, needs a permissions decision) |
| NEW-8 | P2 | CODE | Toasts were not announced to screen readers | `Toast.tsx` | **FIXED**: container is `role="status"` `aria-live="polite"` |

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

- **P0 (2026-10-22):** fixed G-1, G-2 (client side), G-8, NEW-1, NEW-2 and NEW-8; replaced `alert()` with toasts on the group page; data now refreshes without the full-page spinner after a change; added the Playwright e2e suite.

## Deferred

Server-side idempotency keys and integer money (ENHANCEMENT Phase 0). Everything marked OPEN above, by priority.
