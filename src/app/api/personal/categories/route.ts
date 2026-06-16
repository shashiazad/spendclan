import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  return NextResponse.json({ categories: EXPENSE_CATEGORIES });
}
