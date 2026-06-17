import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIConfigured, generateFinancialInsight, friendlyAIError } from "@/lib/gemini";
import { getAIContext } from "@/lib/ai-data";
import { buildAdvisorPrompt } from "@/lib/ai-prompts";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!isAIConfigured()) {
    return NextResponse.json({ error: "AI features are being set up. Check back soon! ✨" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > 500) {
      return NextResponse.json({ error: "Message too long (max 500 characters)" }, { status: 400 });
    }

    const ctx = await getAIContext(auth.session.user.id);
    const prompt = buildAdvisorPrompt(ctx, message);
    const response = await generateFinancialInsight(prompt);

    return NextResponse.json({ response });
  } catch (error: unknown) {
    const rawMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI Chat] Error:", rawMsg);
    const userMsg = friendlyAIError(error);
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
