import type { AIFinancialContext } from "./ai-data";
import { CURRENCY_SYMBOLS } from "./constants";

const SYSTEM_PREAMBLE = `You are a smart, empathetic personal finance advisor embedded in the Xpensio expense tracker app. Your role is to help users manage their money better, avoid unnecessary spending, and build healthier financial habits.

Rules:
- Be specific and actionable — reference actual categories and amounts from the user's data
- Use the user's currency symbol when mentioning amounts
- Be encouraging, not judgmental
- Never recommend specific investment products, stocks, or financial instruments
- Focus on practical, everyday money management tips
- Keep responses concise and scannable (use bullet points, bold text)
`;

function formatContext(ctx: AIFinancialContext): string {
  const sym = CURRENCY_SYMBOLS[ctx.currency] ?? ctx.currency;

  let text = `## User Financial Data (${ctx.currentMonth})\n\n`;
  text += `**Currency**: ${ctx.currency} (${sym})\n\n`;

  text += `### Monthly Summary (Last 3 Months)\n`;
  for (const m of ctx.monthlyData) {
    text += `- **${m.month}**: Income ${sym}${m.income.toFixed(2)}, Expenses ${sym}${m.expenses.toFixed(2)}, Savings ${sym}${m.savings.toFixed(2)}\n`;
  }
  text += `\n**Savings Rate**: ${ctx.savingsRate}%\n\n`;

  text += `### Current Month Expense Breakdown by Type\n`;
  text += `- Daily expenses: ${sym}${ctx.typeBreakdown.daily.toFixed(2)}\n`;
  text += `- Monthly fixed: ${sym}${ctx.typeBreakdown.monthly.toFixed(2)}\n`;
  text += `- Large purchases: ${sym}${ctx.typeBreakdown.large.toFixed(2)}\n\n`;

  if (ctx.categoryBreakdown.length > 0) {
    text += `### Current Month Category Breakdown\n`;
    for (const c of ctx.categoryBreakdown) {
      text += `- ${c.category} (${c.type}): ${sym}${c.amount.toFixed(2)}\n`;
    }
    text += "\n";
  }

  if (ctx.topCategories.length > 0) {
    text += `### Top Spending Categories (3-Month Average)\n`;
    for (const c of ctx.topCategories) {
      text += `- ${c.category}: ${sym}${c.avgPerMonth.toFixed(2)}/month (total ${sym}${c.total.toFixed(2)})\n`;
    }
    text += "\n";
  }

  if (ctx.recurringExpenses.length > 0) {
    text += `### Active Recurring Expenses\n`;
    for (const r of ctx.recurringExpenses) {
      text += `- ${r.category}: ${sym}${r.amount.toFixed(2)} (${r.frequency})\n`;
    }
    text += "\n";
  }

  if (ctx.groupBalances.length > 0) {
    text += `### Group (Pocket) Balances\n`;
    for (const g of ctx.groupBalances) {
      const status = g.balance > 0 ? "owed to user" : g.balance < 0 ? "user owes" : "settled";
      text += `- ${g.groupName}: ${sym}${Math.abs(g.balance).toFixed(2)} (${status})\n`;
    }
    text += "\n";
  }

  return text;
}

export function buildInsightsPrompt(ctx: AIFinancialContext): string {
  return `${SYSTEM_PREAMBLE}

${formatContext(ctx)}

Based on this financial data, provide exactly 4-5 spending insights. Each insight must be one of these types:
- "warning": Something the user should be careful about (overspending, increasing trend)
- "tip": A practical suggestion to save money
- "positive": Something the user is doing well

Also provide:
- A "spending score" from 0-100 (100 = excellent money management)
- A single "top suggestion" (the most impactful thing the user can do)

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "insights": [
    { "type": "warning|tip|positive", "title": "Short title", "description": "Detailed explanation with specific amounts", "savingsEstimate": 0 }
  ],
  "spendingScore": 75,
  "topSuggestion": "One sentence top recommendation"
}`;
}

export function buildReportPrompt(ctx: AIFinancialContext, month: string): string {
  return `${SYSTEM_PREAMBLE}

${formatContext(ctx)}

Generate a comprehensive monthly expense report for ${month}. Structure it as a readable markdown document with these sections:

## 📊 Executive Summary
A 2-3 sentence overview of the financial health this month.

## 💰 Income vs Expenses
Compare income and expenses, highlight the savings/deficit.

## 📁 Category Analysis
For each major spending category, note the amount and whether it's higher/lower than average.

## ⚠️ Unnecessary Spending Flags
Identify any spending patterns that seem excessive or unnecessary. Be specific about which categories and by how much.

## 💡 Recommendations
Provide 3-5 specific, actionable recommendations to improve money management.

## 🎯 Savings Opportunities
Estimate how much the user could save by following your recommendations.

Use the user's currency symbol throughout. Be specific with numbers.`;
}

export function buildAdvisorPrompt(ctx: AIFinancialContext, question: string): string {
  return `${SYSTEM_PREAMBLE}

${formatContext(ctx)}

The user is asking a financial question. Answer it based on their actual spending data above. Be specific, reference their real numbers, and provide actionable advice.

**User's Question**: ${question}

Respond in markdown format. Keep the response focused and under 300 words.`;
}

export function buildUnnecessarySpendPrompt(ctx: AIFinancialContext): string {
  return `${SYSTEM_PREAMBLE}

${formatContext(ctx)}

Analyze the user's spending patterns and identify ALL unnecessary or reducible expenses. For each one:
1. What category is potentially wasteful
2. How much they're spending on it
3. A realistic target they could aim for
4. Estimated monthly savings

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "flags": [
    {
      "category": "Category name",
      "currentSpend": 0,
      "suggestedTarget": 0,
      "potentialSavings": 0,
      "reason": "Why this is flagged",
      "severity": "high|medium|low"
    }
  ],
  "totalPotentialSavings": 0,
  "summary": "One sentence summary"
}`;
}
