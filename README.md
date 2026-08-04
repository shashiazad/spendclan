# SpendClan

> **SpendClan** is a premium, high-performance, and secure personal finance and group expense management web application. Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, and Prisma 7, it empowers users to track daily budgets, manage shared group bills, compute simplified debt settlements, and get financial insights.

<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/b3a20d5e-3f67-4932-b9c5-9dd9f67f6fb0" />

---

## ✨ Features

### 🔐 1. Authentication & Security
*   **Secure Authentication**: Built using `NextAuth.js` with credentials-based login. Passwords securely hashed with `bcryptjs` (12 rounds).
*   **Password Recovery**: Two secure reset channels:
    *   *Email Reset*: Token-based recovery with 1-hour expiration sent via secure SMTP.
    *   *Security Q&A Reset*: Secondary instant recovery option using case-insensitive hashed security questions.
*   **Role-Based Access Control (RBAC)**: Secure separation between standard `USER` accounts and system `ADMIN` accounts.
*   **Data Isolation**: Session-level row security prevents unauthorized data access between users. Group membership is strictly validated on every action.

### 📊 2. Interactive Dashboard & Analytics
*   **Key Financial Metrics**: Real-time display of *Total Income*, *Total Expenses*, *Net Worth*, *Savings*, *Others Owe You*, and *You Owe*.
*   **Visual Spending Trends**: 6-month interactive Area Chart visualizing income vs. expenses vs. savings.
*   **Category Breakdown**: Responsive Pie Chart displaying category distributions for the current month's expenses.
*   **Activity Ledger**: Instant lookup of the most recent financial activities.

### 💰 3. Personal Finance Suite
*   **Expense Management**: Full CRUD operations with detailed categorization (Groceries, Rent, Medical, Dining, etc.) and payment method logging (Cash, Card, UPI).
*   **Income Tracking**: Log earnings from validated sources (Salary, Freelance, Business, Other).
*   **Recurring Expenses**: Monitor daily, weekly, or monthly repeating bills with due dates and overdue highlighting.
*   **Savings Goals**: Create savings goals with progress tracking bars, target deadlines, and inline status updates.

### 👥 4. Group Expense Splitting
*   **Multi-Member Groups**: Group creation with invite-by-email functionality.
*   **Smart Splitting**:
    *   *Equal Splits*: Evenly distributes expenses across all group members.
    *   *Percentage Splits*: Customizable percentage split validation (checks that sum equals 100%).
    *   *Custom Splits*: Splits by exact specified currency amounts.
*   **Simplified Debts**: Employs a greedy matching algorithm to resolve group debts using the minimum number of transactions.
*   **Settlement Logs**: Keep an active ledger of who paid whom with real-time balance sheet updates.

### 🛡️ 5. Administrative Control Panel
*   **User Auditing**: Admins can audit registered users, viewing statistics (roles, active status, group/expense/income counts).
*   **System Actions**: Identify and clean up accounts idle for 30+ days (deletions cascade cleanly; admins cannot delete themselves or other admins).

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Recharts 3
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
| `GEMINI_API_KEY` | Gemini API key for AI Insights *(Optional)* | Get key from Google AI Studio |

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
