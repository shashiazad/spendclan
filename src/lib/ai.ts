import { createHash } from "node:crypto";

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

  // Qwen3-style models bill hidden reasoning tokens against the daily quota, so switch it off
  const reasoning = process.env.AI_REASONING_EFFORT ?? "none";

  const send = async (json: boolean, withReasoning: boolean) => {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 2048,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        ...(withReasoning && reasoning !== "off" ? { reasoning_effort: reasoning } : {}),
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

  // Not every provider/model supports reasoning_effort or response_format; retry once without them
  try {
    return await send(!!opts.json, true);
  } catch (error) {
    if (error instanceof AIRequestError && error.status === 400) return send(false, false);
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
    const wait = msg.match(/try again in ((?:\d+h)?(?:\d+m)?[\d.]*s?)/i)?.[1];
    if (msgLower.includes("per day") || msgLower.includes("tpd")) {
      return `The AI advisor has hit its daily usage limit${wait ? `. Please try again in about ${wait.replace(/\.\d+/, "")}` : ", please try again later"}. 🕒`;
    }
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

export async function generateFinancialInsight(
  prompt: string | ChatTurn[],
  opts: { maxTokens?: number; json?: boolean } = {},
): Promise<string> {
  const messages: ChatTurn[] = typeof prompt === "string" ? [{ role: "user", content: prompt }] : prompt;

  try {
    return await chatCompletion(messages, { temperature: 0.5, maxTokens: opts.maxTokens ?? 700, json: opts.json });
  } catch (error: unknown) {
    // No automatic retries: a retried request burns the same tokens again and 429s are usually quota, not blips
    console.error("[AI] Error generating content:", error instanceof Error ? error.message : error);
    throw new Error(friendlyAIError(error));
  }
}

const aiConfigured = () => aiConfig() !== null;

export function isAIConfigured(): boolean {
  return aiConfigured();
}

// Simple in-memory cache to avoid redundant API calls
const cache = new Map<string, { data: string; expiresAt: number }>();

/** Cached by prompt content, so unchanged group data never costs a second request. */
export async function generateWithCache(
  key: string,
  prompt: string,
  opts: { ttlMs?: number; maxTokens?: number; json?: boolean } = {},
): Promise<string> {
  const fullKey = `${key}:${createHash("sha1").update(prompt).digest("hex")}`;
  const cached = cache.get(fullKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const result = await generateFinancialInsight(prompt, opts);
  cache.set(fullKey, { data: result, expiresAt: Date.now() + (opts.ttlMs ?? 6 * 3600_000) });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return result;
}

const usage = new Map<string, number[]>();

/** Per-user cap on AI calls per hour, so one user can't drain the shared daily token quota. */
export function consumeAIQuota(userId: string, limit = 20): boolean {
  const now = Date.now();
  const recent = (usage.get(userId) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= limit) {
    usage.set(userId, recent);
    return false;
  }
  recent.push(now);
  usage.set(userId, recent);
  return true;
}

export const AI_QUOTA_MESSAGE = "You've asked a lot of questions this hour. Please try again in a bit. 🕒";

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
      { temperature: 0.1, maxTokens: 300 },
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
