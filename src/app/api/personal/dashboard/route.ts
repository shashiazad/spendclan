import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const data = await getDashboardData(auth.session.user.id);

  return NextResponse.json(data);
}
