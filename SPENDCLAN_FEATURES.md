# SpendClan — Premium Expense & Group Finance Manager

SpendClan is a modern, high-performance, and secure personal finance and group expense management web application. Built on Next.js 16 (App Router), React 19, and Prisma 7, SpendClan offers users a robust system to track daily finances, manage group bills, calculate simplified debts, and get financial insights.

---

## 🚀 Key Features

### 🔐 1. Authentication & Security
*   **Secure Signup & Login**: Credentials-based authentication using `NextAuth.js` with passwords securely hashed with `bcryptjs` (12 rounds).
*   **Flexible Password Recovery**:
    *   *Email Reset*: Atomically-validated, single-use, 1-hour expiry tokens sent via secure SMTP.
    *   *Security Q&A Reset*: Secondary reset flow utilizing a hashed security question response for instant recovery.
*   **Role-Based Access Control (RBAC)**: Secure separation between standard users (`USER`) and administrators (`ADMIN`).
*   **Dynamic Data Isolation**: Session-level row protection ensures users can never access or query other users' data, and group queries strictly verify group membership.

### 📊 2. Interactive Dashboard
*   **KPI Metrics Cards**: Highlights *Total Income*, *Total Expenses*, *Total Savings*, *Net Worth*, *Others Owe You*, and *You Owe*.
*   **Spending Trends**: Visualizes income, expenses, and savings over the last 6 months using an interactive Area Chart.
*   **Category Breakdown**: Breakdown of the current month's expenses using a Pie Chart.
*   **Recent Activity**: Real-time listing of the last 5 expenses logged.

### 💰 3. Personal Finance Suite
*   **Expense Management**: Full CRUD operations for expenses categorized by standard groups (Groceries, Rent, Medical, Dining Out, etc.) with support for payment methods (Cash, UPI, Card).
*   **Income Tracking**: Logs and monitors monthly earnings from validated sources (Salary, Freelance, Business, Other).
*   **Recurring Expenses**: Tracks monthly, weekly, or daily repeat expenses with due dates and highlights overdue items.
*   **Savings Tracker**: 
    *   *Monthly Savings Summary*: Auto-calculated delta of `Income - Expenses` along with manual savings inputs.
    *   *Savings Goals*: Card grid displaying goal progress bars, target amounts, deadlines, and interactive inline updates.

### 👥 4. Group Expense Splitting
*   **Group Management**: Create shared groups with detailed descriptions, managing members by email invitations.
*   **Smart Split Calculations**:
    *   *Equal Splits*: Splits the bill equally among members automatically.
    *   *Percentage Splits*: Allows custom percentage splits (validates that they sum up to 100%).
    *   *Custom Splits*: Splits by exact custom amounts.
*   **Greedy Debt Simplification**: Utilizes a greedy matching algorithm to resolve debts among group members using the fewest possible transactions.
*   **Settlements Logging**: Track who paid whom, keeping detailed payment logs and real-time balance calculations.

### 🛡️ 5. Administrative Control Panel
*   **User Auditing**: Admins can audit all system users, viewing their registration date, role, last active timestamp, and statistics (number of groups, expenses, and incomes).
*   **Account Actions**: Highlighting inactive users (idle for 30+ days) with the ability to delete accounts (cannot delete self or other admins).

---

## 🛠️ Tech Stack & Architecture

*   **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Recharts 3
*   **Backend & DB**: Prisma 7 (with `@prisma/adapter-pg` driver optimization), PostgreSQL 16
*   **Authentication**: NextAuth.js 4 (JWT Sessions)
*   **Utilities**: Nodemailer (SMTP), Zod (Zod Schema Validation), Date-fns (Date Formatting), UUID v4 (Unique IDs)
*   **Deployment**: Optimized for Vercel Serverless Platforms with active connection pool recycling.

---

## 📐 Business Logic Highlights

1.  **Net Worth Calculation**:
    $$\text{Net Worth} = \text{Personal Savings} + \text{Others Owe You} - \text{You Owe}$$
2.  **Strict Cascade Deletion**: Deleting a user account cascades to cleanly purge all personal expenses, income history, savings goals, and group associations, maintaining database integrity.
3.  **Secure Token Lifecycle**: Password tokens are destroyed immediately upon query execution to prevent concurrent session replay attacks.
