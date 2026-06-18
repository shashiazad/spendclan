import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCachedDashboardData } from "@/lib/dashboard";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const data = await getCachedDashboardData(auth.session.user.id);

  return NextResponse.json(data);
}

