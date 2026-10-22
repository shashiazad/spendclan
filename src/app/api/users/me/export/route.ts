import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Read-only export of the retired personal-finance data, so users keep a copy now that the UI is gone.

type Row = Record<string, unknown>;

const DATASETS = {
  expenses: (userId: string) =>
    prisma.personalExpense.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      select: { id: true, date: true, amount: true, category: true, type: true, paymentMethod: true, notes: true, createdAt: true },
    }),
  income: (userId: string) =>
    prisma.income.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      select: { id: true, date: true, amount: true, source: true, notes: true, createdAt: true },
    }),
  savings: (userId: string) =>
    prisma.saving.findMany({
      where: { userId },
      orderBy: [{ year: "asc" }, { month: "asc" }],
      select: { id: true, year: true, month: true, amount: true, notes: true, createdAt: true },
    }),
  "savings-goals": (userId: string) =>
    prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, targetAmount: true, currentAmount: true, deadline: true, createdAt: true },
    }),
  recurring: (userId: string) =>
    prisma.recurringExpense.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, category: true, amount: true, frequency: true, nextDueDate: true, paymentMethod: true, isActive: true, notes: true, createdAt: true },
    }),
} satisfies Record<string, (userId: string) => Promise<Row[]>>;

type Dataset = keyof typeof DATASETS;
const DATASET_NAMES = Object.keys(DATASETS) as Dataset[];

function csvCell(value: unknown): string {
  if (value == null) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  // Quote when needed, and neutralise spreadsheet formulas
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\r\n") + "\r\n";
}

function attachment(body: string, filename: string, type: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * GET /api/users/me/export                       → summary: row count per dataset
 * GET /api/users/me/export?format=json            → everything as one JSON file
 * GET /api/users/me/export?format=csv&dataset=…   → one dataset as CSV
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const userId = auth.session.user.id;

  const params = request.nextUrl.searchParams;
  const format = params.get("format");
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const dataset = params.get("dataset") as Dataset | null;
    if (!dataset || !DATASET_NAMES.includes(dataset)) {
      return NextResponse.json({ error: `dataset must be one of: ${DATASET_NAMES.join(", ")}` }, { status: 400 });
    }
    const rows = await DATASETS[dataset](userId);
    return attachment(toCsv(rows), `spendclan-personal-${dataset}-${stamp}.csv`, "text/csv");
  }

  const entries = await Promise.all(DATASET_NAMES.map(async (name) => [name, await DATASETS[name](userId)] as const));

  if (format === "json") {
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), ...Object.fromEntries(entries) }, null, 2);
    return attachment(body, `spendclan-personal-data-${stamp}.json`, "application/json");
  }

  if (format) return NextResponse.json({ error: "format must be json or csv" }, { status: 400 });

  return NextResponse.json({ counts: Object.fromEntries(entries.map(([name, rows]) => [name, rows.length])) });
}
