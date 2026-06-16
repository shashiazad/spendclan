import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIConfigured, generateWithCache } from "@/lib/gemini";
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
          description: "Set your GEMINI_API_KEY environment variable to unlock AI-powered financial insights, spending analysis, and personalized recommendations.",
          savingsEstimate: null,
        },
      ],
      spendingScore: null,
      topSuggestion: "Configure your Gemini API key to get started with AI insights.",
    });
  }

  try {
    const ctx = await getAIContext(auth.session.user.id);
    const prompt = buildInsightsPrompt(ctx);
    const cacheKey = `insights:${auth.session.user.id}`;

    const raw = await generateWithCache(cacheKey, prompt, 3600000);

    let parsed;
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        insights: [{ type: "tip", title: "Analysis Complete", description: raw.slice(0, 300), savingsEstimate: null }],
        spendingScore: 50,
        topSuggestion: "Review your spending patterns for improvement opportunities.",
      };
    }

    return NextResponse.json({ configured: true, ...parsed });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI Insights] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
