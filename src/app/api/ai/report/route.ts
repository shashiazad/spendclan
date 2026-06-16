import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIConfigured, generateFinancialInsight } from "@/lib/gemini";
import { getAIContext } from "@/lib/ai-data";
import { buildReportPrompt } from "@/lib/ai-prompts";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!isAIConfigured()) {
    return NextResponse.json({ error: "AI not configured. Set GEMINI_API_KEY." }, { status: 503 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? String(new Date().getMonth() + 1);
  const year = url.searchParams.get("year") ?? String(new Date().getFullYear());
  const monthLabel = new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "long", year: "numeric" });

  try {
    const ctx = await getAIContext(auth.session.user.id);
    const prompt = buildReportPrompt(ctx, monthLabel);
    const report = await generateFinancialInsight(prompt);

    return NextResponse.json({ report, month: monthLabel });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI Report] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
