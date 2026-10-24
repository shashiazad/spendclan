const DEFAULT_MODEL = "qwen/qwen3.8-27b";
const GROQ_URL = "https://api.groq.com/openai/v1";

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

function aiConfig() {
  const apiKey = process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.AI_BASE_URL || GROQ_URL).replace(/\/+$/, ""),
    model: process.env.AI_MODEL || DEFAULT_MODEL,
  };
}

class AIRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Qwen3-style models emit their reasoning in <think> tags; users should only see the answer. */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*?<\/think>/i, "").trim();
}

async function chatCompletion(
  messages: ChatTurn[],
  opts: { temperature?: number; maxTokens?: number; json?: boolean } = {},
): Promise<string> {
  const cfg = aiConfig();
  if (!cfg) throw new Error("AI_API_KEY is not configured");

  const send = async (json: boolean) => {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 2048,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AIRequestError(`${res.status} ${body.slice(0, 300)}`, res.status);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return stripThinking(data.choices?.[0]?.message?.content ?? "");
  };

  try {
    return await send(!!opts.json);
  } catch (error) {
    // Not every provider/model supports response_format; the prompt already demands JSON
    if (opts.json && error instanceof AIRequestError && error.status === 400) return send(false);
    throw error;
  }
}

/** Pulls the first JSON object out of a model reply, tolerating code fences and chatter. */
export function parseJsonObject<T>(raw: string): T | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
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

  if (msgLower.includes("401") || msgLower.includes("403") || msgLower.includes("invalid api key") || msgLower.includes("unauthorized")) {
    return "The AI service rejected our credentials. Please let the admin know the AI API key needs updating.";
  }

  if (msgLower.includes("404") || msgLower.includes("no endpoints") || msgLower.includes("model_not_found")) {
    return "The configured AI model isn't available right now. Please let the admin know.";
  }

  if (msgLower.includes("api_key") || msgLower.includes("not configured") || msgLower.includes("api key")) {
    return "AI features are being set up. Check back soon! ✨";
  }

  if (msgLower.includes("timeout") || msgLower.includes("deadline")) {
    return "The AI advisor took too long to respond. Please try a shorter question or try again in a moment.";
  }

  return "Something unexpected happened with our AI advisor. Please try again in a moment. 🙏";
}

export async function generateFinancialInsight(prompt: string | ChatTurn[], maxRetries = 3): Promise<string> {
  const messages: ChatTurn[] = typeof prompt === "string" ? [{ role: "user", content: prompt }] : prompt;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await chatCompletion(messages, { temperature: 0.6, maxTokens: 2048 });
    } catch (error: unknown) {
      attempt++;
      const errMsg = error instanceof Error ? error.message : String(error);
      const isRateLimit = (error instanceof AIRequestError && error.status === 429) || errMsg.toLowerCase().includes("rate limit");

      if (isRateLimit && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`[AI] Rate limit hit (429). Retrying in ${backoffMs}ms... (Attempt ${attempt}/${maxRetries})`);
        await delay(backoffMs);
        continue;
      }

      console.error(`[AI] Error generating content (Attempt ${attempt}):`, errMsg);
      throw new Error(friendlyAIError(error));
    }
  }

  throw new Error("SpendClan AI is analyzing a lot of balance sheets right now! 📊 Please give us a quick moment and try asking your question again.");
}

const aiConfigured = () => aiConfig() !== null;

export function isAIConfigured(): boolean {
  return aiConfigured();
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
 * Uses the AI model to parse a user's natural language question into search terms and SQL filters.
 */
export async function transformQuery(userMessage: string): Promise<TransformedQuery> {
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
    const text = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.1, json: true, maxTokens: 512 },
    );
    const parsed = parseJsonObject<TransformedQuery>(text);
    if (!parsed) throw new Error("Model returned no JSON");
    
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
  if (!isAIConfigured()) return null;

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
    const resultText = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `User Message: "${userMessage}"` },
      ],
      { temperature: 0.1, maxTokens: 512 },
    );
    if (!resultText || resultText === "NO_CHANGE" || resultText.includes("NO_CHANGE")) {
      return null;
    }

    return resultText;
  } catch (error) {
    console.error("[Preference Extraction] Failed to extract preferences:", error);
    return null;
  }
}
