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
    } catch (error: any) {
      attempt++;
      
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      
      if (isRateLimit && attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s...
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`[Gemini] Rate limit hit (429). Retrying in ${backoffMs}ms... (Attempt ${attempt}/${maxRetries})`);
        await delay(backoffMs);
        continue;
      }
      
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Gemini] Error generating content (Attempt ${attempt}):`, msg);
      throw new Error(`AI generation failed: ${msg}`);
    }
  }
  
  throw new Error("AI generation failed after max retries");
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
