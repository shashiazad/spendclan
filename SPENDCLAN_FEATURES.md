# SpendClan — Group Expense Splitting

SpendClan is a secure group expense app built on Next.js 16 (App Router), React 19, and Prisma 7. Flatmates, trips and teams share expenses, split them fairly, see who owes whom, and settle up in the fewest payments.

> Personal finance (dashboard, personal expenses, income, recurring, savings) was retired. The old pages redirect to `/groups`, the old APIs answer `410 Gone`, and existing records are kept read-only and downloadable from **Profile → Your personal finance data** (JSON or CSV).

---

## 🚀 Key Features

### 🔐 1. Authentication & Security
*   **Secure Signup & Login**: Credentials and Google sign-in via `NextAuth.js`; passwords hashed with `bcryptjs` (12 rounds).
*   **Flexible Password Recovery**:
    *   *Email Reset*: Atomically-validated, single-use, 1-hour expiry tokens sent via secure SMTP.
    *   *Security Q&A Reset*: Secondary reset flow using a hashed security answer.
*   **Role-Based Access Control (RBAC)**: Standard users (`USER`) and administrators (`ADMIN`).
*   **Data Isolation**: Every group query verifies active membership; users can never read another group's data.

### 👥 2. Groups
*   **Group Management**: Create groups, add members by search or email invitation, and manage them from Group settings.
*   **Splits**: Equal, exact amounts or percentages, choosing exactly who is included; rounding remainders go to the payer.
*   **Expense List**: Grouped by month with totals, your share, search, and a per-expense "you lent / you borrowed" summary.
*   **Debt Simplification**: A greedy matching algorithm resolves balances in the fewest possible payments.
*   **Settlements**: Record who paid whom with real-time balances.
*   **Floating + button**: Add a group expense from anywhere; on a group page it targets that group.
*   **Search and filters**: Text (contains, starts with, typo-tolerant), amount, who paid, who's involved, who added it, dates, split type and status, across one group or all groups; `paid:me >500 date:last30`-style tokens; filters live in the URL; saved and recent searches.
*   **Home, Balances, Activity**: Bento Home (net balance, who to settle with, groups, activity, spend by group), a Balances page netting each person across groups, and an activity feed.
*   **Design**: Minimal cards with glass only on floating layers; light and dark themes following the system; floating bottom bar on phones, icon rail on tablets, sidebar on desktop; WCAG 2.2 AA checked with axe.

### 🛡️ 3. Data Safety
*   **No hard deletes in groups**: Groups, expenses, settlements and memberships are soft-deleted; foreign keys are `RESTRICT`.
*   **Edit history**: Every expense edit stores a snapshot of the previous version.
*   **Ownership**: Only the person who added an expense can edit or delete it (older rows fall back to the payer), with Undo after delete.
*   **Users with group history are never deleted.**

### ✨ 4. AI Group Advisor
*   **Insights, monthly reports and chat** about your groups: spend per group and month, who has been paying, balances and suggested settle-up payments — using only groups you belong to.

### 📄 5. Reports
*   **PDF reports** for a single group or all your groups, by month.

### 🛠️ 6. Administrative Control Panel
*   **User Auditing**: Registration date, role, last activity, number of groups and expenses paid.
*   **Account Actions**: Inactive users (idle 30+ days) can be deleted unless they have group history; admins cannot delete themselves or other admins.

---

## 🛠️ Tech Stack & Architecture

*   **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
*   **Backend & DB**: Prisma 7 (with `@prisma/adapter-pg`), PostgreSQL 16
*   **Authentication**: NextAuth.js 4 (JWT Sessions)
*   **AI**: Groq (Llama 3.3)
*   **Utilities**: Nodemailer (SMTP), Zod, date-fns, jsPDF
*   **Testing**: Vitest (unit), Playwright (e2e on Chromium and WebKit, axe-core accessibility, visual baselines)
*   **Deployment**: Vercel

---

## 📐 Business Logic Highlights

1.  **Balances**: For each member, `paid − share of expenses + settlements paid − settlements received`.
2.  **Soft deletes everywhere in groups**: Nothing a group depends on is ever purged.
3.  **Secure Token Lifecycle**: Password tokens are destroyed immediately on use to prevent replay.
