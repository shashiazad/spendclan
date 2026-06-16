# Ledgerly

Personal finance and group expense management web app.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, Recharts 3
- PostgreSQL 16, Prisma 7
- NextAuth.js 4 (Credentials + JWT)

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (or use Docker Compose)

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start PostgreSQL (optional - via Docker)
docker compose up db -d

# Push schema to database
npm run db:push

# Seed demo users
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

| Email | Password | Role |
| --- | --- | --- |
| admin@ledgerly.com | admin123 | ADMIN |
| user@ledgerly.com | user123 | USER |

## Docker (Full Stack)

```bash
docker compose up --build
```

- **App**: Available at [http://localhost](http://localhost) via Nginx reverse proxy.
- **Mailpit Web UI (Mock Inbox)**: Available at [http://localhost:8025](http://localhost:8025) (every email sent by the app during local registration/testing goes here instantly).

## Environment Variables

See `.env.example` for all required variables:

- `DATABASE_URL` — PostgreSQL connection string.
- `NEXTAUTH_SECRET` — Random secret for JWT signing.
- `NEXTAUTH_URL` — App URL (e.g. `http://localhost`).
- `SMTP_HOST` — SMTP server host (e.g. `mailpit` in local Docker, or a real service like `smtp.resend.com` in production).
- `SMTP_PORT` — SMTP port (e.g. `1025` for Mailpit, `587` or `465` for production).
- `SMTP_SECURE` — `true` for TLS (port 465) or `false` for STARTTLS (port 587).
- `SMTP_USER` & `SMTP_PASS` — Credentials for the SMTP server.
- `SMTP_FROM` — Sender email address (e.g. `Ledgerly <noreply@yourdomain.com>`).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo users |

## Features

- **Auth**: Register, login, email reset, security Q&A reset
- **Personal Finance**: Expenses, income, recurring expenses, savings & goals
- **Dashboard**: Summary cards, spending trends, category breakdown
- **Groups**: Shared expenses with equal/percentage/custom splits, balance tracking, settlements
- **Admin**: User management panel
