import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIConfigured, generateWithCache, friendlyAIError, parseJsonObject } from "@/lib/ai";
import { getAIContext } from "@/lib/ai-data";
import { buildRemindersPrompt } from "@/lib/ai-prompts";

const TONES: Record<string, string> = {
  friendly: "warm and friendly",
  casual: "casual and playful, light emoji allowed",
  formal: "polite and professional",
};

type Reminder = { name: string; amount: number; message: string };

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!isAIConfigured()) {
    return NextResponse.json({ error: "AI features are being set up. Check back soon! ✨" }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const tone = TONES[body.tone] ?? TONES.friendly;

    const ctx = await getAIContext(auth.session.user.id);
    if (!ctx.people.some((p) => p.net > 0.005)) {
      return NextResponse.json({ reminders: [] });
    }

    const raw = await generateWithCache(`reminders:${auth.session.user.id}`, buildRemindersPrompt(ctx, tone), { maxTokens: 600, json: true });
    const parsed = parseJsonObject<{ reminders: Reminder[] }>(raw);
    const reminders = (parsed?.reminders ?? []).filter(
      (r) => typeof r?.name === "string" && typeof r?.message === "string",
    );
    if (reminders.length === 0) throw new Error("Model returned no reminders");

    return NextResponse.json({ reminders });
  } catch (error: unknown) {
    console.error("[AI Reminders] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: friendlyAIError(error) }, { status: 500 });
  }
}
