import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Error: DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY is not set.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Helper to delay execution (prevents rate limits)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("Starting DB Setup & Embeddings Migration...");

  // 1. Install custom SQL function for cosine similarity in PostgreSQL
  console.log("Installing database-side 'cosine_similarity' function...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION cosine_similarity(a double precision[], b double precision[])
    RETURNS double precision AS $$
    DECLARE
      dot_product double precision := 0;
      norm_a double precision := 0;
      norm_b double precision := 0;
      i integer;
    BEGIN
      IF array_length(a, 1) IS NULL OR array_length(b, 1) IS NULL OR array_length(a, 1) != array_length(b, 1) THEN
        RETURN 0;
      END IF;
      FOR i IN 1..array_length(a, 1) LOOP
        dot_product := dot_product + a[i] * b[i];
        norm_a := norm_a + a[i] * a[i];
        norm_b := norm_b + b[i] * b[i];
      END LOOP;
      IF norm_a = 0 OR norm_b = 0 THEN
        RETURN 0;
      END IF;
      RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `);
  console.log("✅ 'cosine_similarity' function successfully installed/updated.");

  // 2. Fetch expenses that do not have embeddings
  console.log("Fetching expenses lacking embeddings...");
  const allExpenses = await prisma.personalExpense.findMany();
  const targetExpenses = allExpenses.filter(e => !e.embedding || e.embedding.length === 0);

  console.log(`Found ${targetExpenses.length} expenses to backfill.`);

  let successCount = 0;
  for (let i = 0; i < targetExpenses.length; i++) {
    const expense = targetExpenses[i];
    
    // Construct rich text document representation
    const notesStr = expense.notes?.trim() ? ` Notes: ${expense.notes.trim()}` : "";
    const dateStr = expense.date.toISOString().split("T")[0];
    
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

    const documentText = `Expense details - Amount: ${expense.amount} | Category: ${expense.category}${categoryContext} | Method: ${expense.paymentMethod} | Type: ${expense.type} | Date: ${dateStr}${notesStr}`.trim();

    try {
      console.log(`[${i + 1}/${targetExpenses.length}] Generating embedding for: "${documentText.substring(0, 60)}..."`);
      
      const response = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: documentText,
      });

      const values = response.embeddings?.[0]?.values;
      if (values && Array.isArray(values)) {
        await prisma.personalExpense.update({
          where: { id: expense.id },
          data: { embedding: values }
        });
        successCount++;
      } else {
        console.warn(`⚠️ Embedding generation returned empty values for expense ${expense.id}`);
      }

      // Small delay to avoid hitting Gemini rate limits
      await delay(300);
    } catch (err) {
      console.error(`❌ Failed to embed expense ${expense.id}:`, err);
    }
  }

  console.log(`Embeddings migration complete. Successfully migrated ${successCount}/${targetExpenses.length} expenses.`);
}

main()
  .catch((e) => {
    console.error("Migration script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
