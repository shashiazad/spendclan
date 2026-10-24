import type { AIGroupContext, RelevantGroupExpense } from "./ai-data";
import { CURRENCY_SYMBOLS } from "./constants";

const SYSTEM_PREAMBLE = `You are the SpendClan Group Expense Assistant. You ONLY answer questions about the user's SpendClan groups: shared expenses, who paid, each person's share, balances, and how to settle up — using the data provided to you below.

CRITICAL RULES:
1. Stick strictly to the provided group data. Do not invent expenses, people, groups or balances.
2. If the data needed is missing, say: "I don't see any recorded group expenses for that yet."
3. If the user asks something unrelated (e.g., "Write a poem", "How is the weather?"), politely refuse: "I can only help with your SpendClan groups — shared expenses, balances and settling up. 💸"
4. "You" in the data is the user. A positive balance means others owe the user; a negative balance means the user owes others.
5. Format responses cleanly: bold totals, bullet points, and the user's currency symbol.
6. Be friendly and neutral — never blame or shame any group member.
7. Never recommend investment products or give tax or legal advice.
8. Keep responses concise and specific: reference real groups, people and amounts.
`;

function money(sym: string, n: number) {
  return `${n < 0 ? "-" : ""}${sym}${Math.abs(n).toFixed(2)}`;
}

function formatContext(ctx: AIGroupContext): string {
  const sym = CURRENCY_SYMBOLS[ctx.currency] ?? ctx.currency;

  let text = `## User's Group Data (${ctx.currentMonth})\n\n`;
  text += `**Currency**: ${ctx.currency} (${sym})\n`;
  text += `**Across all groups**: others owe the user ${money(sym, ctx.totals.owedToYou)}, the user owes ${money(sym, ctx.totals.youOwe)}, net ${money(sym, ctx.totals.net)}\n\n`;

  if (ctx.groups.length === 0) {
    return text + "The user is not in any groups yet.\n\n";
  }

  text += `### Last 3 Months (all groups)\n`;
  for (const m of ctx.monthly) {
    text += `- **${m.month}**: group spend ${money(sym, m.groupSpend)}, user's share ${money(sym, m.yourShare)}, user paid ${money(sym, m.youPaid)}\n`;
  }
  text += "\n";

  text += `### Groups\n`;
  for (const g of ctx.groups) {
    const status = g.yourBalance > 0 ? "owed to the user" : g.yourBalance < 0 ? "the user owes" : "settled";
    text += `- **${g.name}** (${g.memberCount} members, ${g.expenseCount} expenses): balance ${money(sym, Math.abs(g.yourBalance))} (${status}); this month ${money(sym, g.spendThisMonth)} spent, user's share ${money(sym, g.yourShareThisMonth)}; last 3 months ${money(sym, g.spendLast3Months)}\n`;
    for (const s of g.settleUp) {
      text += `  - Suggested payment: ${s.from} → ${s.to} ${money(sym, s.amount)}\n`;
    }
  }
  text += "\n";

  if (ctx.people.length > 0) {
    text += `### Net With Each Person (all groups)\n`;
    for (const p of ctx.people) {
      text += `- ${p.name}: ${p.net > 0 ? `owes the user ${money(sym, p.net)}` : `the user owes ${money(sym, -p.net)}`}\n`;
    }
    text += "\n";
  }

  if (ctx.biggestThisMonth.length > 0) {
    text += `### Biggest Expenses This Month\n`;
    for (const e of ctx.biggestThisMonth) {
      text += `- ${e.date} · ${e.group} · ${e.description}: ${money(sym, e.amount)} paid by ${e.paidBy}, user's share ${money(sym, e.yourShare)}\n`;
    }
    text += "\n";
  }

  return text;
}

export function buildInsightsPrompt(ctx: AIGroupContext): string {
  return `${SYSTEM_PREAMBLE}

${formatContext(ctx)}

Based on this group data, provide exactly 4-5 insights. Each insight must be one of these types:
- "warning": something to watch (a large unsettled balance, one person paying most of the bills, spend rising month over month)
- "tip": a practical suggestion (who to settle with first, how to split recurring costs more fairly)
- "positive": something going well (groups that are settled, balanced contributions)

Also provide:
- A "spendingScore" from 0-100 for how healthy the user's group finances are (100 = everything settled and contributions balanced)
- A single "topSuggestion" (the most useful next step, e.g. a specific settle-up payment)

Use "savingsEstimate" for the amount the insight is about (e.g. the balance to settle), or null.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "insights": [
    { "type": "warning|tip|positive", "title": "Short title", "description": "Explanation with specific groups, people and amounts", "savingsEstimate": 0 }
  ],
  "spendingScore": 75,
  "topSuggestion": "One sentence recommendation"
}`;
}

export function buildReportPrompt(ctx: AIGroupContext, month: string): string {
  return `${SYSTEM_PREAMBLE}

${formatContext(ctx)}

Write a group expense report for ${month} as a readable markdown document with these sections:

## 📊 Summary
2-3 sentences: total group spend, the user's share, and whether they are owed or owe overall.

## 👥 Groups
For each group: what was spent, the user's share, and their balance.

## 💳 Who Paid
Who has been paying for the group bills, and whether contributions look balanced.

## 🤝 Settle Up
The suggested payments that clear the user's balances, largest first.

## 💡 Suggestions
3-5 specific, practical suggestions for keeping the groups fair and settled.

Use the user's currency symbol throughout. Be specific with numbers.`;
}

export function buildAdvisorPrompt(
  ctx: AIGroupContext,
  question: string,
  relevantExpenses?: RelevantGroupExpense[],
  userName?: string,
  advisorNotes?: string | null,
  isFollowUp = false,
): string {
  let text = `${SYSTEM_PREAMBLE}

${formatContext(ctx)}`;

  if (advisorNotes) {
    text += `### What the User Has Told You Before (Memory)\n${advisorNotes}\n\n`;
  }

  if (relevantExpenses && relevantExpenses.length > 0) {
    const sym = CURRENCY_SYMBOLS[ctx.currency] ?? ctx.currency;
    text += `### Group Expenses Matching the Question\n`;
    for (const e of relevantExpenses) {
      text += `- **${e.date}** · ${e.group} · ${e.description}: ${money(sym, e.amount)} paid by ${e.paidBy}, user's share ${money(sym, e.yourShare)}\n`;
    }
    text += "\n";
  }

  const greetingInstruction = isFollowUp ? "This is a follow-up in an ongoing conversation: do not greet again, answer directly." : userName ? `Warmly greet the user by name (e.g. "Hello, ${userName}!") in your first sentence.` : "Warmly greet the user.";

  text += `The user is asking about their groups. Answer from the data above: reference real groups, people and amounts, and suggest concrete next steps where useful.

${greetingInstruction}

**User's Question**: ${question}

Respond in markdown format. Keep the response focused and under 300 words.`;

  return text;
}

export function buildRemindersPrompt(ctx: AIGroupContext, tone: string): string {
  const sym = CURRENCY_SYMBOLS[ctx.currency] ?? ctx.currency;
  const debtors = ctx.people.filter((p) => p.net > 0.005);
  const list = debtors.map((p) => `- ${p.name} owes the user ${money(sym, p.net)}`).join("\n");

  return `${SYSTEM_PREAMBLE}

${formatContext(ctx)}

Draft a short payment reminder message the user can paste into WhatsApp or SMS, for each person below who owes the user money:
${list}

Tone: ${tone}. Each message is 1-3 sentences, mentions the exact amount, never blames or shames, and suggests paying via UPI/bank transfer or settling in SpendClan. Do not invent amounts or people.

Respond ONLY with valid JSON (no markdown, no code fences):
{ "reminders": [ { "name": "Person name exactly as above", "amount": 0, "message": "The message text" } ] }`;
}
