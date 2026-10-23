import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getHomeData } from "@/lib/home-data";

/** GET /api/home — balances, people and per-group summaries for the Home screen. Read-only. */
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  return NextResponse.json(await getHomeData(auth.session.user.id));
}
