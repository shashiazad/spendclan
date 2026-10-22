# SpendClan Requirements

Group expense splitting web app. (Personal finance — dashboard, expenses, income, recurring, savings — was retired; see §9.)

## 1. Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, Font: Inter
- **Charts**: Recharts 3
- **Database**: PostgreSQL 16, Prisma 7 (with `@prisma/adapter-pg`)
- **Auth**: NextAuth.js 4 (Credentials provider, JWT sessions)
- **Other**: bcryptjs, Nodemailer (SMTP), date-fns, uuid, Zod 4
- **Deployment**: Vercel

## 2. Authentication

- **Register**: Name, Email (unique), Password (bcrypt, 12 rounds), Currency (INR/USD/EUR/GBP), Security Question + Answer (answer hashed)
- **Login**: Email + Password → JWT session containing `id`, `name`, `email`, `currency`
- **Password Reset (Email)**: Generates token (1-hour expiry), sends SMTP email with reset link. Single-use token. Generic response to prevent enumeration.
- **Password Reset (Security Q&A)**: Step 1: enter email get question. Step 2: answer + new password. Case-insensitive answer comparison.
- **Roles**: `USER` (default), `ADMIN`. Admin routes check role via `requireAdmin()`
- All auth routes use `requireAuth()`
- **Session Guard**: Dashboard layout redirects unauthenticated users to `/login`

## 3. Database Models

- **User**: id (UUID), name, email (unique), hashedPassword, currency (default `"INR"`), role (USER/ADMIN), securityQuestion?, securityAnswer? (hashed), lastActive?, createdAt, updatedAt
- **PersonalExpense, Income, Saving, SavingsGoal, RecurringExpense**: *Deprecated, read-only.* Kept with all rows for the Profile data export; nothing writes to them. Removing them requires a separate, reviewed migration.
- **Group**: id, name, description?, createdAt, updatedAt, deletedAt?, deletedById?
- **GroupMember**: id, role (ADMIN/MEMBER), userId (FK, restrict), groupId (FK, restrict), joinedAt, removedAt?, removedById?. Unique: userId+groupId
- **GroupExpense**: id, amount, description, date, splitType (EQUAL/PERCENTAGE/CUSTOM), paidById (FK), groupId (FK, restrict), createdById?, updatedById?, deletedAt?, deletedById?
- **GroupExpenseRevision**: id, groupExpenseId (FK, restrict), editedById, snapshot (JSON of the expense before the edit), createdAt
- **GroupSplit**: id, amount, groupExpenseId (FK, restrict), userId (FK, restrict)
- **Settlement**: id, amount, fromId (FK), toId (FK), groupId (FK, restrict), createdAt, deletedAt?, deletedById?
- **PasswordResetToken**: id, token (unique, indexed), userId (FK, cascade), expiresAt, createdAt

## 4. Constants

- **Currencies**: INR (default), USD, EUR, GBP
- **Security Questions**: 8 predefined (first pet, mother's maiden name, birth city, first school, favorite book, childhood nickname, street name, first car)

## 5. Routes & Features

| Route | Description |
| --- | --- |
| `/(auth)/login` | Email + password sign-in |
| `/(auth)/register` | Registration with security question |
| `/(auth)/forgot-password` | Email reset request |
| `/(auth)/reset-password` | Token-based reset form |
| `/(auth)/reset-password-qa` | Security Q&A reset |
| `/` | Landing page; signed-in users go to `/groups` |
| `/(dashboard)/groups` | Group list + creation |
| `/(dashboard)/groups/[id]` | Group detail (tabs: Expenses, Balances, Settlements) |
| `/(dashboard)/advisor` | AI Group Advisor (insights, report, chat) |
| `/(dashboard)/profile` | Profile, credentials, personal data export |
| `/(dashboard)/admin` | Admin user management |
| `/dashboard`, `/personal/*` | Permanent redirect (308) to `/groups` |

### Layouts

- **Auth**: Centered card on dark gradient background
- **Dashboard**: Left sidebar (collapsible on mobile) + footer. Sidebar links: Groups, AI Advisor, About, Admin (admins). Phone bottom bar: Groups, Advisor, Profile, Menu. Floating + adds a group expense.

### Groups

- Card grid showing name, members (avatar badges), expense count
- Create: Name, Description, Member Emails (comma-separated, existing users only). Creator → ADMIN.

### Group Detail (3 tabs)

- **Expenses**: Add with split (Equal/Percentage/Custom). Per-member inputs for non-equal splits. Expense cards with split breakdown. Delete.
- **Balances**: Total spend, member balances (positive = owed to them), simplified debts (greedy algorithm).
- **Settlements**: Record payment (amount + recipient). History list. Add members by email. Member list.

### Admin

- ADMIN-only. User table with role, last active, stats (groups, expenses paid). Inactive highlighting (30+ days). Delete non-admin users without group history (confirm dialog). Cannot delete self or other admins.

## 6. API Endpoints

### Auth

| Method | Endpoint |
| --- | --- |
| POST | `/api/auth/register` |
| POST | `/api/auth/[...nextauth]` |
| POST | `/api/auth/forgot-password` |
| POST | `/api/auth/reset-password` |
| GET/POST | `/api/auth/reset-password-qa` |

### Retired personal endpoints

| Method | Endpoint |
| --- | --- |
| any | `/api/personal/*`, `/api/reports/personal` → `410 Gone` |
| GET | `/api/users/me/export` (counts), `?format=json`, `?format=csv&dataset=expenses\|income\|savings\|savings-goals\|recurring` |

### Groups

| Method | Endpoint |
| --- | --- |
| GET/POST | `/api/groups` |
| DELETE | `/api/groups/[id]` |
| GET/POST/DELETE | `/api/groups/[id]/expenses` |
| GET | `/api/groups/[id]/balance` |
| GET/POST | `/api/groups/[id]/settle` |
| POST/DELETE | `/api/groups/[id]/members` |

### Admin

| Method | Endpoint |
| --- | --- |
| GET | `/api/admin/users` |
| DELETE | `/api/admin/users/[id]` |

## 7. Environment Variables

`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## 8. Business Rules

1. **Group Splits**: Equal (auto), Percentage (must sum to 100%), Custom (exact amounts)
2. **Group Balance**: `sum(paid) − sum(share) + sum(settlements_sent) − sum(settlements_received)`
3. **Simplified Debts**: Greedy matching of largest creditors/debtors (threshold 0.01)
4. **Data Isolation**: Group queries verify active membership.
5. **No hard deletes in groups**: Groups, expenses, settlements and memberships are soft-deleted; users with group history are never deleted.
6. **Expense ownership**: Only the person who added an expense can edit or delete it (legacy rows: the payer).
7. **Admin Constraints**: Cannot delete self or other admins. Only group admins can delete groups or remove members.

## 9. Retired: Personal Finance

SpendClan is group-only. The personal dashboard, expenses, income, recurring and savings pages were removed; their URLs redirect to `/groups` and their APIs return `410 Gone`. No tables, columns or rows were dropped — the data stays read-only and users can download it from Profile.
