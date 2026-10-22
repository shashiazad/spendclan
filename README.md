# SpendClan

> **SpendClan** is a secure group expense app. Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, and Prisma 7, it lets flatmates, trips and teams share expenses, split them any way they like, see who owes whom, and settle up in the fewest payments.
>
> Personal finance (expenses, income, recurring, savings) was retired. Existing personal records are kept read-only and can be downloaded from **Profile → Your personal finance data**.

---

## ✨ Features

### 🔐 1. Authentication & Security
*   **Secure Authentication**: Built using `NextAuth.js` with credentials-based login. Passwords securely hashed with `bcryptjs` (12 rounds).
*   **Password Recovery**: Two secure reset channels:
    *   *Email Reset*: Token-based recovery with 1-hour expiration sent via secure SMTP.
    *   *Security Q&A Reset*: Secondary instant recovery option using case-insensitive hashed security questions.
*   **Role-Based Access Control (RBAC)**: Secure separation between standard `USER` accounts and system `ADMIN` accounts.
*   **Data Isolation**: Session-level row security prevents unauthorized data access between users. Group membership is strictly validated on every action.

### 👥 2. Group Expense Splitting
*   **Groups**: Create groups and add members by search or email invitation.
*   **Flexible splits**: Equal, exact amounts or percentages, with a choice of exactly who is included.
*   **Month-wise expense list**: Monthly totals, your share, and what each expense means for you (you lent / you borrowed).
*   **Simplified debts**: A greedy matching algorithm settles the group in the fewest payments.
*   **Settlements**: Record who paid whom; balances update immediately.
*   **Nothing is lost**: Groups, expenses, settlements and memberships are soft-deleted; every edit keeps a revision. Only the person who added an expense can edit or delete it.

### ✨ 3. AI Group Advisor
*   **Insights, reports and chat** about your groups: spend per group and month, who has been paying, balances, and suggested settle-up payments. Only data from groups you belong to is used.

### 📄 4. Reports
*   **PDF reports** per group and across all your groups.

### 🛡️ 5. Administrative Control Panel
*   **User Auditing**: Admins can audit registered users, viewing statistics (roles, active status, groups and expenses paid).
*   **System Actions**: Identify accounts idle for 30+ days and delete them — except users with any group history, which are never deleted (admins cannot delete themselves or other admins).

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Database & ORM**: PostgreSQL 16, Prisma 7 (optimized with `@prisma/adapter-pg` driver)
- **Authentication**: NextAuth.js 4 (JWT Sessions)
- **Utilities**: Nodemailer (SMTP), Zod (Validation), date-fns, UUID v4
- **Deployment**: Vercel

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 16+

### Setup Instructions

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/spendclan.git
    cd spendclan
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure environment variables**:
    Copy the example env file and update it with your local credentials:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and set your `DATABASE_URL` (e.g. `postgresql://user:password@localhost:5432/spendclan`).

4.  **Sync database schema**:
    Push the database schema directly to your local instance using Prisma:
    ```bash
    npm run db:push
    ```

5.  **Seed the demo data**:
    Seed your local database with default categories and a demo user account:
    ```bash
    npm run db:seed
    ```

6.  **Run the development server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo & Seeding Accounts

After seeding the database, you can log in with the following demo user:

| Email | Password | Role | Description |
| --- | --- | --- | --- |
| `user@spendclan.app` | `user123` | `USER` | Default demo account loaded with seed data |

> **Note on Admin Accounts**:
> To seed a system administrator account, configure the following variables in your `.env` file before running `npm run db:seed`:
> ```env
> SEED_ADMIN_EMAIL="admin@yourdomain.com"
> SEED_ADMIN_PASSWORD="your-secure-password"
> SEED_ADMIN_ANSWER="your-security-answer"
> ```

---

## ⚙️ Environment Variables

The application reads the following configuration variables. Ensure they are configured before deployment:

| Variable | Description | Example / Recommended Value |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@host:5432/db` |
| `NEXTAUTH_SECRET` | A secure, random string for signing JWTs | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base URL of the deployed application | `http://localhost:3000` (Local) / `https://yourdomain.com` |
| `SMTP_HOST` | SMTP server host address | `smtp.resend.com` or `smtp.gmail.com` |
| `SMTP_PORT` | Port for sending SMTP mail | `587` (STARTTLS) or `465` (TLS) |
| `SMTP_SECURE` | Use SSL/TLS | `true` for 465, `false` for 587 |
| `SMTP_USER` | SMTP authentication user | `apikey` (Resend) or your email |
| `SMTP_PASS` | SMTP authentication password | Your SMTP password or app-specific password |
| `SMTP_FROM` | Sender address shown on transactional emails | `SpendClan <noreply@yourdomain.com>` |


---

## 📦 Scripts Reference

| Command | Action |
| --- | --- |
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Builds the application for production |
| `npm run start` | Starts the production built server |
| `npm run db:push` | Pushes Prisma schema modifications directly to the database |
| `npm run db:migrate` | Runs database migrations (for production track) |
| `npm run db:seed` | Seeds database with initial tables and demo users |
| `npm run lint` | Runs ESLint checker |

---

## 🛡️ Production & Security Considerations

Before making your repository public or deploying to staging/production:
*   Ensure that `.env` files are never tracked (verify they are ignored in `.gitignore`).
*   Always use database connection pooling (such as Prisma transaction poolers via PgBouncer or serverless adapters) when deploying to serverless platforms like Vercel.
*   Keep your `NEXTAUTH_SECRET` secure and rotating.
*   Avoid adding any plain text credentials, API keys, or live DB strings to documentation or source code.
