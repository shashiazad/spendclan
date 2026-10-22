import Groq from "groq-sdk";

let groqClient: Groq | null = null;

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Maps raw AI API errors to user-friendly messages */
export function friendlyAIError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  const msgLower = msg.toLowerCase();

  if (
    msgLower.includes("503") ||
    msgLower.includes("unavailable") ||
    msgLower.includes("high demand") ||
    msgLower.includes("overloaded")
  ) {
    return "SpendClan AI is analyzing a lot of balance sheets right now! 📊 Please give us a quick moment and try asking your question again.";
  }

  if (
    msgLower.includes("429") ||
    msgLower.includes("resource_exhausted") ||
    msgLower.includes("rate limit")
  ) {
    return "SpendClan AI is analyzing a lot of balance sheets right now! 📊 Please give us a quick moment and try asking your question again.";
  }

  if (msgLower.includes("api_key") || msgLower.includes("not configured") || msgLower.includes("api key")) {
    return "AI features are being set up. Check back soon! ✨";
  }

  if (msgLower.includes("timeout") || msgLower.includes("deadline")) {
    return "The AI advisor took too long to respond. Please try a shorter question or try again in a moment.";
  }

  return "Something unexpected happened with our AI advisor. Please try again in a moment. 🙏";
}

export async function generateFinancialInsight(prompt: string, maxRetries = 3): Promise<string> {
  const ai = getGroqClient();
  if (!ai) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const response = await ai.chat.completions.create({
        model: "llama-3.3-70b-versatile", // Using Groq's high-performance Llama 3.3 70B
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      });

      return response.choices[0]?.message?.content ?? "";
    } catch (error: unknown) {
      attempt++;
      
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStatus = (error && typeof error === "object" && "status" in error) ? (error as { status: number }).status : undefined;
      const isRateLimit = errStatus === 429 || errMsg.includes('429') || errMsg.includes('rate limit');
      
      if (isRateLimit && attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s...
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`[Groq] Rate limit hit (429). Retrying in ${backoffMs}ms... (Attempt ${attempt}/${maxRetries})`);
        await delay(backoffMs);
        continue;
      }
      
      const rawMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Groq] Error generating content (Attempt ${attempt}):`, rawMsg);
      throw new Error(friendlyAIError(error));
    }
  }
  
  throw new Error("SpendClan AI is analyzing a lot of balance sheets right now! 📊 Please give us a quick moment and try asking your question again.");
}

export function isAIConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}

// Simple in-memory cache to avoid redundant API calls
const cache = new Map<string, { data: string; expiresAt: number }>();

export async function generateWithCache(
  key: string,
  prompt: string,
  ttlMs: number = 3600000, // 1 hour default
): Promise<string> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const result = await generateFinancialInsight(prompt);
  cache.set(key, { data: result, expiresAt: Date.now() + ttlMs });
  return result;
}

export interface StructuredQueryFilters {
  dateStart: string | null;
  dateEnd: string | null;
  minAmount: number | null;
  maxAmount: number | null;
}

export interface TransformedQuery {
  searchQuery: string;
  filters: StructuredQueryFilters;
}

/**
 * Uses Groq to parse a user's natural language question into search terms and SQL filters.
 */
export async function transformQuery(userMessage: string): Promise<TransformedQuery> {
  const ai = getGroqClient();
  if (!ai) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const now = new Date();
  const systemPrompt = `
You are an AI Query Transformer for SpendClan, an app for splitting group expenses.
Your task is to analyze the user's natural language question about their group expenses and extract structured search filters.

Analyze the question and extract:
1. "searchQuery": The core term to look for in expense descriptions (e.g., "hotel", "uber", "rent", "dinner", "groceries"). Keep it short. If the question is general (e.g. "who owes me?"), return an empty string "".
2. "filters": A JSON object containing:
   - "dateStart" (ISO string or null): Start of the date range the user mentions ("last week", "in June", "since yesterday").
   - "dateEnd" (ISO string or null): End of that date range.
   - "minAmount" (number or null): Minimum expense amount.
   - "maxAmount" (number or null): Maximum expense amount.

The current time is ${now.toISOString()} (${now.toUTCString()}). Resolve relative dates against it.

Return ONLY a valid JSON object matching this exact TypeScript structure. Do NOT wrap in markdown backticks or code blocks.
{
  "searchQuery": string,
  "filters": {
    "dateStart": string | null,
    "dateEnd": string | null,
    "minAmount": number | null,
    "maxAmount": number | null
  }
}
`;

  try {
    const response = await ai.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Using Llama 3.3 70B for JSON capability
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(text) as TransformedQuery;
    
    // Ensure structure is clean and default values exist
    return {
      searchQuery: parsed.searchQuery || "",
      filters: {
        dateStart: parsed.filters?.dateStart || null,
        dateEnd: parsed.filters?.dateEnd || null,
        minAmount: parsed.filters?.minAmount ?? null,
        maxAmount: parsed.filters?.maxAmount ?? null,
      },
    };
  } catch (error) {
    console.error("[Query Transformation] Failed to transform query, using fallback:", error);
    return {
      searchQuery: userMessage,
      filters: {
        dateStart: null,
        dateEnd: null,
        minAmount: null,
        maxAmount: null,
      },
    };
  }
}

/**
 * Analyzes the user's message for persistent financial goals, rules, or constraints.
 * If found, returns an updated set of notes to save in the database.
 * If no change is needed, returns null.
 */
export async function extractAdvisorNotes(
  userMessage: string,
  currentNotes: string | null
): Promise<string | null> {
  const ai = getGroqClient();
  if (!ai) return null;

  const notesContext = currentNotes ? `Existing User Preferences/Goals:\n${currentNotes}` : "No existing preferences recorded yet.";

  const systemPrompt = `
You are the SpendClan Group Preference Extractor.
Your task is to analyze the user's incoming chat message and determine if they are sharing any persistent preferences or arrangements about their groups and shared expenses.

Examples of persistent information to capture:
- Group budgets (e.g., "Our Goa trip budget is 40,000", "Keep flat groceries under 6000 a month")
- Arrangements between people (e.g., "Ravi always pays the internet bill", "Priya and I split rent 60/40")
- Settle-up habits (e.g., "We settle up on the 1st of every month", "I prefer to pay by UPI")
- Upcoming plans (e.g., "We're planning a trip to Manali in December")

Your job:
1. Compare the message against the existing preferences list.
2. If the user shares new persistent constraints or goals, update or append them to the list. Keep it structured, concise, and bulleted.
3. If they retract a budget or rule, remove it.
4. If the user's message is a simple question (e.g., "Who owes me?"), a greeting, or contains no new persistent rules/goals, output exactly the word "NO_CHANGE".
5. Do NOT include markdown blocks or code fences, just return the plain text list or the word "NO_CHANGE".

${notesContext}
`;

  try {
    const response = await ai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `User Message: "${userMessage}"` }
      ],
      temperature: 0.1,
    });

    const resultText = response.choices[0]?.message?.content?.trim();
    if (!resultText || resultText === "NO_CHANGE" || resultText.includes("NO_CHANGE")) {
      return null;
    }

    return resultText;
  } catch (error) {
    console.error("[Preference Extraction] Failed to extract preferences:", error);
    return null;
  }
}
