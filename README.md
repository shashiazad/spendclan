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
- PostgreSQL 16

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your PostgreSQL connection string

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

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Set the following environment variables in the Vercel dashboard:
   - `DATABASE_URL` — PostgreSQL connection string (e.g. from [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)).
   - `NEXTAUTH_SECRET` — Random secret for JWT signing.
   - `NEXTAUTH_URL` — Your production URL (e.g. `https://ledgerly.vercel.app`).
   - `SMTP_HOST` — SMTP server host (e.g. `smtp.resend.com`).
   - `SMTP_PORT` — SMTP port (`587` for STARTTLS, `465` for TLS).
   - `SMTP_SECURE` — `true` for TLS (port 465) or `false` for STARTTLS (port 587).
   - `SMTP_USER` & `SMTP_PASS` — Credentials for the SMTP server.
   - `SMTP_FROM` — Sender email address (e.g. `Ledgerly <noreply@yourdomain.com>`).
4. Deploy. Vercel will automatically run `npm run build` (which includes `prisma generate`).
5. After the first deploy, run migrations against your production database:
   ```bash
   DATABASE_URL="your-production-connection-string" npx prisma db push
   ```

## Environment Variables

See `.env.example` for all required variables:

- `DATABASE_URL` — PostgreSQL connection string.
- `NEXTAUTH_SECRET` — Random secret for JWT signing.
- `NEXTAUTH_URL` — App URL (e.g. `http://localhost:3000` locally, `https://yourdomain.com` in production).
- `SMTP_HOST` — SMTP server host (e.g. `smtp.resend.com`).
- `SMTP_PORT` — SMTP port (`587` for STARTTLS, `465` for TLS).
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
