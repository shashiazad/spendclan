import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIConfigured, type ChatTurn, generateFinancialInsight, friendlyAIError, extractAdvisorNotes, consumeAIQuota, AI_QUOTA_MESSAGE } from "@/lib/ai";
import { findRelevantGroupExpenses, getAIContext } from "@/lib/ai-data";
import { buildAdvisorPrompt } from "@/lib/ai-prompts";
import { prisma } from "@/lib/prisma";

const PREFERENCE_HINT = /\b(budget|always|never|usually|prefer|every month|monthly|planning|plan to|trip|remember|limit|split .*\d+\/\d+|settle on)\b/i;
const STOPWORDS = new Set(["who", "what", "when", "which", "how", "much", "many", "did", "does", "paid", "spent", "spend", "owes", "owe", "this", "that", "last", "month", "week", "have", "show", "tell", "about", "group", "groups", "expense", "expenses", "settle", "balance", "total", "most", "from", "with", "kisne", "kitna", "kitne", "kharch", "mera", "maine", "hai", "kya", "sabse", "zyada", "jyada"]);

/** Longest non-trivial word of the question, used as an expense-description search term. */
function pickSearchTerm(message: string): string {
  const words = message.toLowerCase().match(/[a-z]{4,}/g) ?? [];
  return words.filter((w) => !STOPWORDS.has(w)).sort((a, b) => b.length - a.length)[0] ?? "";
}

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

    // Recent turns give the model conversational context; only the last few are sent
    const history: ChatTurn[] = Array.isArray(body.history)
      ? body.history
          .filter((t: { role?: string; content?: unknown }) => (t?.role === "user" || t?.role === "assistant") && typeof t.content === "string")
          .slice(-4)
          .map((t: { role: "user" | "assistant"; content: string }) => ({ role: t.role, content: t.content.slice(0, 600) }))
      : [];

    const userId = auth.session.user.id;
    if (!consumeAIQuota(userId)) return NextResponse.json({ error: AI_QUOTA_MESSAGE }, { status: 429 });

    // 1. Look up expenses matching the question's keywords (a plain DB query, no extra model call)
    const relevantExpenses = await findRelevantGroupExpenses(userId, { searchQuery: pickSearchTerm(message) });

    // 2. Fetch the group summary and user profile memory concurrently
    const [ctx, user] = await Promise.all([
      getAIContext(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, advisorNotes: true }
      })
    ]);

    // 3. Generate final response using Augmented Generation (passing user name and memory notes)
    const prompt = buildAdvisorPrompt(ctx, message, relevantExpenses, user?.name, user?.advisorNotes, history.length > 0);
    const response = await generateFinancialInsight([...history, { role: "user", content: prompt }], { maxTokens: 700 });

    // 4. Only messages that sound like a standing preference/budget/plan cost an extra model call
    if (PREFERENCE_HINT.test(message)) extractAdvisorNotes(message, user?.advisorNotes ?? null)
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
