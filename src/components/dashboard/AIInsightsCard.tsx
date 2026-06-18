"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SpendingScore } from "@/components/ui/SpendingScore";
import { Button } from "@/components/ui/Button";

type Insight = {
  type: "warning" | "tip" | "positive";
  title: string;
  description: string;
  savingsEstimate?: number | null;
};

type InsightsData = {
  configured: boolean;
  insights: Insight[];
  spendingScore: number | null;
  topSuggestion: string;
};

const typeConfig = {
  warning: { icon: "⚠️", color: "border-amber-500/30 bg-amber-500/5" },
  tip: { icon: "💡", color: "border-blue-500/30 bg-blue-500/5" },
  positive: { icon: "✅", color: "border-emerald-500/30 bg-emerald-500/5" },
};

export function AIInsightsCard() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User-initiated only — no useEffect auto-fetch
  async function fetchInsights() {
    setIsAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/insights");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to load");
      }
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load AI insights");
    }
    setIsAiLoading(false);
  }

  // Loading state — isolated, doesn't block the rest of the page
  if (isAiLoading) {
    return (
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 ai-gradient" />
        <div className="relative space-y-4 p-6">
          <div className="flex items-center gap-2">
            <div className="skeleton h-5 w-5 rounded-full" />
            <div className="skeleton h-5 w-32" />
          </div>
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
          <p className="text-center text-xs text-slate-400 animate-pulse">
            Analyzing your spending patterns...
          </p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 ai-gradient" />
        <div className="relative p-6 text-center">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm text-slate-300 font-medium mb-1">AI is taking a breather</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">{error}</p>
          <Button size="sm" variant="ghost" onClick={fetchInsights} className="mt-3">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  // Default idle state — shown on mount, no API call made yet
  if (!data) {
    return (
      <Card className="relative overflow-hidden" padding="none">
        <div className="absolute inset-0 ai-gradient" />
        <div className="relative">
          <div className="flex items-center justify-between border-b border-slate-800/50 px-6 py-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <h3 className="text-sm font-semibold text-slate-200">AI Insights</h3>
            </div>
            <Link href="/advisor" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Open Advisor →
            </Link>
          </div>
          <div className="p-6 text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
              <svg className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-200 mb-1">
              Ready to analyze your spending
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Click below to get AI-powered insights on your income, expenses, and savings patterns.
            </p>
            <Button onClick={fetchInsights} size="sm">
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Generate AI Insights
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Results state — only rendered after user clicked "Generate AI Insights"
  return (
    <Card className="relative overflow-hidden" padding="none">
      <div className="absolute inset-0 ai-gradient" />
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <h3 className="text-sm font-semibold text-slate-200">AI Insights</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchInsights}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              aria-label="Refresh insights"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
            <Link href="/advisor" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              View All →
            </Link>
          </div>
        </div>

        <div className="p-6">
          {/* Score + Top Suggestion */}
          <div className="mb-5 flex items-center gap-5">
            {data.spendingScore != null && (
              <SpendingScore score={data.spendingScore} size={80} strokeWidth={6} />
            )}
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Top Suggestion</p>
              <p className="mt-1 text-sm text-slate-300">{data.topSuggestion}</p>
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-2">
            {data.insights.slice(0, 3).map((insight, i) => {
              const config = typeConfig[insight.type] ?? typeConfig.tip;
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-3 transition-all hover:brightness-110 ${config.color}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm">{config.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{insight.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{insight.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
