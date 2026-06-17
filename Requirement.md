# Xpensio Requirements

Personal finance group expense management web app.

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
- **PersonalExpense**: id, amount (Float), category (String), date, paymentMethod (CASH/UPI/CARD), notes?, type (DAILY/LARGE), userId (FK, cascade). Indexes: userId, userId+date, userId+category
- **Income**: id, amount, source (Salary/Freelance/Business/Other — validated server-side), date, notes?, userId (FK, cascade). Indexes: userId, userId+date
- **Saving**: id, amount, month (Int), year (Int), notes?, userId (FK, cascade). Unique: userId+month+year (upsert on duplicate)
- **SavingsGoal**: id, name, targetAmount, currentAmount (default 0), deadline?, userId (FK, cascade)
- **RecurringExpense**: id, amount, category, frequency (DAILY/WEEKLY/MONTHLY), nextDueDate, paymentMethod (CASH/UPI/CARD), notes?, isActive (default true), userId (FK, cascade)
- **Group**: id, name, description?, createdAt, updatedAt
- **GroupMember**: id, role (ADMIN/MEMBER), userId (FK, cascade), groupId (FK, cascade), joinedAt. Unique: userId+groupId
- **GroupExpense**: id, amount, description, date, splitType (EQUAL/PERCENTAGE/CUSTOM), paidById (FK), groupId (FK, cascade)
- **GroupSplit**: id, amount, groupExpenseId (FK, cascade), userId (FK, cascade)
- **Settlement**: id, amount, fromId (FK), toId (FK), groupId (FK, cascade), createdAt
- **PasswordResetToken**: id, token (unique, indexed), userId (FK, cascade), expiresAt, createdAt

## 4. Constants

- **Expense Categories**: Groceries, Rent, Family Transfer, Credit Card Bill, Loan EMI, Trip, Dining Out, Food Delivery, Medicine, Consultation, Misc
- **Income Sources**: Salary, Freelance, Business, Other
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
| `/` | Redirect to `/dashboard` |
| `/(dashboard)/dashboard` | Financial overview |
| `/(dashboard)/personal/expenses` | Expense CRUD with filters |
| `/(dashboard)/personal/income` | Income CRUD with filters |
| `/(dashboard)/personal/recurring` | Recurring expense management |
| `/(dashboard)/personal/savings` | Savings entries + goals |
| `/(dashboard)/groups` | Group list + creation |
| `/(dashboard)/groups/[id]` | Group detail (tabs: Expenses, Balances, Settlements) |
| `/(dashboard)/admin` | Admin user management |

### Layouts

- **Auth**: Centered card on dark gradient background
- **Dashboard**: Left sidebar (collapsible on mobile) + footer. Sidebar links: Dashboard, Expenses, Income, Recurring, Savings, Groups

### Dashboard

- 6 summary cards: Total Income, Total Expenses, Savings, Net Worth, Others Owe You, You Owe
- **Spending Trends**: Area chart (last 6 months income, expenses, savings)
- **Category Breakdown**: Pie chart for current month
- Recent 5 expenses list

### Personal Expenses

- Month/year filter dropdowns
- Add form: Amount, Category, Date, Payment Method, Type, Notes
- Table with totals. Delete with `confirm()`
- Full CRUD with month/year/category/type query filters

### Income

- Month/year filter. Warning: "only real earnings."
- Add form: Amount, Source, Date, Notes. Server validates source.
- Table with totals. Full CRUD.

### Recurring Expenses

- Add form: Amount, Category, Frequency, Next Due Date, Payment Method, Notes
- Card grid (Active/Inactive sections). Toggle active state. Overdue highlighting.

### Savings

- **Monthly Savings**: 3 summary cards (income, expenses, calculated savings). Manual savings entry (upsert per month/year).
- **Savings Goals**: Card grid with progress bars. Inline progress update. CRUD.

### Groups

- Card grid showing name, members (avatar badges), expense count
- Create: Name, Description, Member Emails (comma-separated, existing users only). Creator → ADMIN.

### Group Detail (3 tabs)

- **Expenses**: Add with split (Equal/Percentage/Custom). Per-member inputs for non-equal splits. Expense cards with split breakdown. Delete.
- **Balances**: Total spend, member balances (positive = owed to them), simplified debts (greedy algorithm).
- **Settlements**: Record payment (amount + recipient). History list. Add members by email. Member list.

### Admin

- ADMIN-only. User table with role, last active, stats (expenses/income/groups). Inactive highlighting (30+ days). Delete non-admin users (two-click confirm). Cannot delete self or other admins.

## 6. API Endpoints

### Auth

| Method | Endpoint |
| --- | --- |
| POST | `/api/auth/register` |
| POST | `/api/auth/[...nextauth]` |
| POST | `/api/auth/forgot-password` |
| POST | `/api/auth/reset-password` |
| GET/POST | `/api/auth/reset-password-qa` |

### Personal

| Method | Endpoint |
| --- | --- |
| GET/POST/PUT/DELETE | `/api/personal/expenses` |
| GET/POST/PUT/DELETE | `/api/personal/income` |
| GET/POST/PUT/DELETE | `/api/personal/recurring` |
| GET/POST/DELETE | `/api/personal/savings` |
| GET | `/api/personal/savings/calculate` |
| GET/POST/PUT/DELETE | `/api/personal/savings/goals` |
| GET | `/api/personal/categories` |
| GET | `/api/personal/dashboard` |
| GET | `/api/personal/summary` |

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

1. **Savings**: Income − Expenses per month. Manual savings entries are independent.
2. **Net Worth**: Personal Savings + Others Owe You − You Owe
3. **Group Splits**: Equal (auto), Percentage (must sum to 100%), Custom (exact amounts)
4. **Group Balance**: `sum(paid) − sum(share) + sum(settlements_sent) − sum(settlements_received)`
5. **Simplified Debts**: Greedy matching of largest creditors/debtors (threshold 0.01)
6. **Income Validation**: Only Salary/Freelance/Business/Other accepted server-side
7. **Recurring Expenses**: Manual tracking only (not auto-executed). Overdue items highlighted.
8. **Data Isolation**: Personal queries scoped to userId. Group queries verify membership.
9. **Cascade Deletes**: User deletion cascades to all personal data. Group deletion cascades to members/expenses/splits/settlements.
10. **Admin Constraints**: Cannot delete self or other admins. Only group admins can delete groups or remove members.
