import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

let groqClient: Groq | null = null;
let geminiClient: GoogleGenAI | null = null;

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
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
        model: "llama3-70b-8192", // Using Groq's high-performance Llama 3 70B
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

/**
 * Generates text embedding for the provided content using Gemini text-embedding-004
 * (Groq doesn't provide an embedding model natively yet)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured for embeddings");
  }

  try {
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text,
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || !Array.isArray(values)) {
      throw new Error("Invalid embedding response from Gemini API");
    }
    return values;
  } catch (error) {
    console.error("[Gemini Embedding] Error generating embedding:", error);
    return [];
  }
}

interface ExpenseInput {
  amount: number;
  category: string;
  date: Date | string;
  paymentMethod: string;
  type: string;
  notes?: string | null;
}

/**
 * Transforms an expense object into an enriched text document for vector embedding.
 */
export function transformExpenseToDocument(expense: ExpenseInput): string {
  const noteStr = expense.notes?.trim() ? ` Notes: ${expense.notes.trim()}` : "";
  const dateStr = expense.date instanceof Date ? expense.date.toISOString().split("T")[0] : String(expense.date).split("T")[0];
  
  // Category mapping to add synonyms and enrich search space
  let categoryContext = "";
  const cat = expense.category.toLowerCase();
  if (cat === "food") categoryContext = " (dining, restaurant, cafe, coffee, groceries, meals, snacks, drinks)";
  else if (cat === "transportation") categoryContext = " (cab, taxi, uber, petrol, fuel, train, bus, travel, commute)";
  else if (cat === "rent") categoryContext = " (housing, flat, apartment, landlord, accommodation)";
  else if (cat === "utilities") categoryContext = " (electricity, water, wifi, internet, power, gas, bill)";
  else if (cat === "entertainment") categoryContext = " (movies, games, outings, drinks, party, hobby, fun)";
  else if (cat === "medical") categoryContext = " (health, doctor, pharmacy, medicine, hospital, clinic)";
  else if (cat === "shopping") categoryContext = " (clothes, electronics, amazon, purchase, gift, retail)";
  else if (cat === "education") categoryContext = " (books, courses, tuition, school, fees, learning)";
  
  return `Expense details - Amount: ${expense.amount} | Category: ${expense.category}${categoryContext} | Method: ${expense.paymentMethod} | Type: ${expense.type} | Date: ${dateStr}${noteStr}`.trim();
}

export interface StructuredQueryFilters {
  dateStart: string | null;
  dateEnd: string | null;
  category: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  paymentMethod: string | null;
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

  const systemPrompt = `
You are an AI Query Transformer for a personal finance system called SpendClan.
Your task is to analyze the user's natural language question and extract structured query filters.

Analyze the question and extract:
1. "searchQuery": The core semantic search term (e.g., "coffee", "uber", "rent", "concert", "pizza"). Keep it clean and short. If the question is general or has no specific search term, return an empty string "".
2. "filters": A JSON object containing metadata filters:
   - "dateStart" (ISO string, e.g., "2026-06-01T00:00:00.000Z", or null): The starting date for transaction filtering (e.g. if the user says "last week", "in June 2026", "since yesterday").
   - "dateEnd" (ISO string, e.g., "2026-06-30T23:59:59.999Z", or null): The ending date for transaction filtering.
   - "category" (string or null): Must be one of the exact SpendClan categories: "Food", "Rent", "Utilities", "Transportation", "Entertainment", "Medical", "Education", "Shopping", "Other". Map user concepts to these (e.g., "restaurant" -> "Food", "cab" -> "Transportation").
   - "minAmount" (number or null): Minimum transaction amount.
   - "maxAmount" (number or null): Maximum transaction amount.
   - "paymentMethod" (string or null): Must be one of "CASH", "UPI", "CARD".

Current local time is: ${new Date().toISOString()}.
Assume the current year is 2026. Today is Sunday, July 12, 2026.
Use relative date offsets correctly (e.g. "last week" = July 5, 2026 to July 11, 2026; "June" = June 1, 2026 to June 30, 2026).

Return ONLY a valid JSON object matching this exact TypeScript structure. Do NOT wrap in markdown backticks or code blocks.
{
  "searchQuery": string,
  "filters": {
    "dateStart": string | null,
    "dateEnd": string | null,
    "category": string | null,
    "minAmount": number | null,
    "maxAmount": number | null,
    "paymentMethod": string | null
  }
}
`;

  try {
    const response = await ai.chat.completions.create({
      model: "llama3-70b-8192", // Using Llama 3 70B for JSON capability
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
        category: parsed.filters?.category || null,
        minAmount: parsed.filters?.minAmount || null,
        maxAmount: parsed.filters?.maxAmount || null,
        paymentMethod: parsed.filters?.paymentMethod || null,
      },
    };
  } catch (error) {
    console.error("[Query Transformation] Failed to transform query, using fallback:", error);
    return {
      searchQuery: userMessage,
      filters: {
        dateStart: null,
        dateEnd: null,
        category: null,
        minAmount: null,
        maxAmount: null,
        paymentMethod: null,
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
You are the SpendClan Financial Goal and Preference Extractor.
Your task is to analyze the user's incoming chat message and determine if they are sharing any persistent financial constraints, budgets, preferences, or goals.

Examples of persistent information to capture:
- Savings targets (e.g., "I want to save 10k this month", "Saving for a trip to Japan")
- Category budgets (e.g., "My budget for food is 5000 INR", "I want to spend less than 2000 on shopping")
- Financial constraints or lifestyle rules (e.g., "I am trying to stop buying coffee", "I only commute via public transport")
- Personal financial context (e.g., "I got a raise, my new salary is 90,000")

Your job:
1. Compare the message against the existing preferences list.
2. If the user shares new persistent constraints or goals, update or append them to the list. Keep it structured, concise, and bulleted.
3. If they retract a budget or rule, remove it.
4. If the user's message is a simple question (e.g., "How much did I spend?"), a greeting, or contains no new persistent rules/goals, output exactly the word "NO_CHANGE".
5. Do NOT include markdown blocks or code fences, just return the plain text list or the word "NO_CHANGE".

${notesContext}
`;

  try {
    const response = await ai.chat.completions.create({
      model: "llama3-70b-8192",
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
