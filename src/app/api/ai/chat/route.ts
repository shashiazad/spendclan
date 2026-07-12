import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIConfigured, generateFinancialInsight, friendlyAIError, transformQuery, generateEmbedding, extractAdvisorNotes } from "@/lib/gemini";
import { getAIContext } from "@/lib/ai-data";
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

    // 1. Run Query Transformation using Gemini to parse filters & semantic query
    const { searchQuery, filters } = await transformQuery(message);

    // 2. Generate search query embedding if a term is present
    let queryEmbedding: number[] = [];
    if (searchQuery.trim().length > 0) {
      queryEmbedding = await generateEmbedding(searchQuery);
    }

    const hasEmbedding = queryEmbedding.length > 0;

    // 3. Execute Hybrid Search (Postgres filters + Vector Cosine Similarity)
    const rawExpenses = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT 
        id, amount, category, date, notes, "paymentMethod", type,
        CASE 
          WHEN $1::boolean = true AND array_length(embedding, 1) > 0 THEN cosine_similarity(embedding, $2::double precision[])
          ELSE 1.0
        END as similarity
      FROM "PersonalExpense"
      WHERE "userId" = $3
        AND ($4::timestamp IS NULL OR date >= $4::timestamp)
        AND ($5::timestamp IS NULL OR date <= $5::timestamp)
        AND ($6::text IS NULL OR category = $6::text)
        AND ($7::double precision IS NULL OR amount >= $7::double precision)
        AND ($8::double precision IS NULL OR amount <= $8::double precision)
        AND ($9::text IS NULL OR "paymentMethod"::text = $9::text)
      ORDER BY similarity DESC
      LIMIT 15
      `,
      hasEmbedding,
      queryEmbedding,
      userId,
      filters.dateStart ? new Date(filters.dateStart) : null,
      filters.dateEnd ? new Date(filters.dateEnd) : null,
      filters.category,
      filters.minAmount,
      filters.maxAmount,
      filters.paymentMethod
    );

    // 4. Fetch the high-level monthly summaries and user profile memory concurrently
    const [ctx, user] = await Promise.all([
      getAIContext(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, advisorNotes: true }
      })
    ]);

    // 5. Generate final response using Augmented Generation (passing user name and memory notes)
    const prompt = buildAdvisorPrompt(ctx, message, rawExpenses, user?.name, user?.advisorNotes);
    const response = await generateFinancialInsight(prompt);

    // 6. Asynchronously extract and update advisor notes/memory in the background
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
