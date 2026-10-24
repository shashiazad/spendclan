import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIConfigured, generateWithCache, friendlyAIError, parseJsonObject } from "@/lib/ai";
import { getAIContext } from "@/lib/ai-data";
import { buildInsightsPrompt } from "@/lib/ai-prompts";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!isAIConfigured()) {
    return NextResponse.json({
      configured: false,
      insights: [
        {
          type: "tip",
          title: "AI Features Available",
          description: "Set the AI_API_KEY environment variable to unlock AI insights on your groups, balances and settle-ups.",
          savingsEstimate: null,
        },
      ],
      spendingScore: null,
      topSuggestion: "Configure the AI API key to get started with AI insights.",
    });
  }

  try {
    const ctx = await getAIContext(auth.session.user.id);
    const prompt = buildInsightsPrompt(ctx);
    const cacheKey = `insights:${auth.session.user.id}`;

    const raw = await generateWithCache(cacheKey, prompt, 3600000);

    let parsed = parseJsonObject<{ insights: unknown[]; spendingScore: number; topSuggestion: string }>(raw);
    if (!parsed || !Array.isArray(parsed.insights)) {
      parsed = {
        insights: [{ type: "tip", title: "Analysis Complete", description: raw.slice(0, 300), savingsEstimate: null }],
        spendingScore: 50,
        topSuggestion: "Review your group balances and settle up where you can.",
      };
    }

    return NextResponse.json({ configured: true, ...parsed });
  } catch (error: unknown) {
    const rawMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI Insights] Error:", rawMsg);
    const userMsg = friendlyAIError(error);
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
