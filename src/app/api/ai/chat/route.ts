import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIConfigured, generateFinancialInsight, friendlyAIError, transformQuery, extractAdvisorNotes } from "@/lib/ai";
import { findRelevantGroupExpenses, getAIContext } from "@/lib/ai-data";
import { buildAdvisorPrompt } from "@/lib/ai-prompts";
import { prisma } from "@/lib/prisma";

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

    const userId = auth.session.user.id;

    // 1. Parse the question into a description search term and date/amount filters
    const { searchQuery, filters } = await transformQuery(message);

    // 2. Look up matching expenses in the user's own groups only
    const relevantExpenses = await findRelevantGroupExpenses(userId, { searchQuery, ...filters });

    // 3. Fetch the group summary and user profile memory concurrently
    const [ctx, user] = await Promise.all([
      getAIContext(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, advisorNotes: true }
      })
    ]);

    // 4. Generate final response using Augmented Generation (passing user name and memory notes)
    const prompt = buildAdvisorPrompt(ctx, message, relevantExpenses, user?.name, user?.advisorNotes);
    const response = await generateFinancialInsight(prompt);

    // 5. Asynchronously extract and update advisor notes/memory in the background
    extractAdvisorNotes(message, user?.advisorNotes ?? null)
      .then(async (newNotes) => {
        if (newNotes) {
          await prisma.user.update({
            where: { id: userId },
            data: { advisorNotes: newNotes },
          });
        }
      })
      .catch((err) => {
        console.error("[AI Chat] Failed to update advisor notes in background:", err);
      });

    return NextResponse.json({ response });
  } catch (error: unknown) {
    const rawMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI Chat] Error:", rawMsg);
    const userMsg = friendlyAIError(error);
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
