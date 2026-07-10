import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Maps raw Gemini API errors to user-friendly messages */
export function friendlyAIError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  const msgLower = msg.toLowerCase();

  if (
    msgLower.includes("503") ||
    msgLower.includes("unavailable") ||
    msgLower.includes("high demand") ||
    msgLower.includes("overloaded")
  ) {
    return "SpendClan AI is analyzing a lot of balance sheets right now! \ud83d\udcca Please give us a quick moment and try asking your question again.";
  }

  if (
    msgLower.includes("429") ||
    msgLower.includes("resource_exhausted") ||
    msgLower.includes("rate limit")
  ) {
    return "SpendClan AI is analyzing a lot of balance sheets right now! \ud83d\udcca Please give us a quick moment and try asking your question again.";
  }

  if (msgLower.includes("api_key") || msgLower.includes("not configured")) {
    return "AI features are being set up. Check back soon! \u2728";
  }

  if (msgLower.includes("timeout") || msgLower.includes("deadline")) {
    return "The AI advisor took too long to respond. Please try a shorter question or try again in a moment.";
  }

  return "Something unexpected happened with our AI advisor. Please try again in a moment. \ud83d\ude4f";
}

export async function generateFinancialInsight(prompt: string, maxRetries = 3): Promise<string> {
  const ai = getClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });

      return response.text ?? "";
    } catch (error: unknown) {
      attempt++;
      
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStatus = (error && typeof error === "object" && "status" in error) ? (error as { status: number }).status : undefined;
      const isRateLimit = errStatus === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');
      
      if (isRateLimit && attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s...
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`[Gemini] Rate limit hit (429). Retrying in ${backoffMs}ms... (Attempt ${attempt}/${maxRetries})`);
        await delay(backoffMs);
        continue;
      }
      
      const rawMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Gemini] Error generating content (Attempt ${attempt}):`, rawMsg);
      throw new Error(friendlyAIError(error));
    }
  }
  
  throw new Error("SpendClan AI is analyzing a lot of balance sheets right now! \ud83d\udcca Please give us a quick moment and try asking your question again.");
}

export function isAIConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
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
