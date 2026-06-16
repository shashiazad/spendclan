import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMonthlyTotals } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));

  if (
    Number.isNaN(month) ||
    Number.isNaN(year) ||
    month < 1 ||
    month > 12
  ) {
    return NextResponse.json(
      { error: "Valid month and year query parameters are required" },
      { status: 400 },
    );
  }

  const totals = await getMonthlyTotals(auth.session.user.id, month, year);

  const manualSaving = await prisma.saving.findUnique({
    where: {
      userId_month_year: {
        userId: auth.session.user.id,
        month,
        year,
      },
    },
  });

  return NextResponse.json({
    ...totals,
    calculatedSavings: totals.savings,
    manualSaving: manualSaving?.amount ?? null,
  });
}
