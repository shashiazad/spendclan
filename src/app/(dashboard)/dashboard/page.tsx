"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { AIInsightsCard } from "@/components/dashboard/AIInsightsCard";
import { formatCurrency, TYPE_COLORS } from "@/lib/constants";
import { format } from "date-fns";

type DashboardData = {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    savings: number;
    netWorth: number;
    othersOweYou: number;
    youOwe: number;
    remaining: number;
  };
  typeBreakdown: { daily: number; monthly: number; large: number };
  quickStats: {
    avgDailySpend: number;
    topCategory: string | null;
    biggestExpense: { amount: number; category: string } | null;
  };
  trends: { month: string; income: number; expenses: number; savings: number }[];
  categoryBreakdown: { category: string; amount: number }[];
  recentExpenses: {
    id: string;
    amount: number;
    category: string;
    date: string;
    paymentMethod: string;
    type: string;
  }[];
};

const CHART_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1", "#64748b",
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const currency = session?.user?.currency ?? "INR";

  // Dynamic Theme state for SVG Charts alignment
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const checkTheme = () => {
      setIsLight(document.documentElement.classList.contains("light"));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const gridStroke = isLight ? "#e5e5ea" : "#2c2c2e";
  const textFill = "#8e8e93"; // Apple System Adaptive Gray
  const tooltipBg = isLight ? "#ffffff" : "#1c1c1e";
  const tooltipBorder = isLight ? "#e5e5ea" : "#2c2c2e";
  const tooltipLabel = isLight ? "#000000" : "#ffffff";

  useEffect(() => {
    fetch("/api/personal/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-slate-400">Failed to load dashboard.</p>;
  }

  const summaryCards = [
    { label: "Total Income", value: data.summary.totalIncome, color: "text-income", icon: "↑" },
    { label: "Total Expenses", value: data.summary.totalExpenses, color: "text-expense", icon: "↓" },
    { label: "Remaining", value: data.summary.remaining, color: data.summary.remaining >= 0 ? "text-income" : "text-expense", icon: "◎" },
    { label: "Net Worth", value: data.summary.netWorth, color: "text-savings", icon: "★" },
    { label: "Others Owe You", value: data.summary.othersOweYou, color: "text-savings", icon: "←" },
    { label: "You Owe", value: data.summary.youOwe, color: "text-ai-accent", icon: "→" },
  ];

  const totalTypeSpend = data.typeBreakdown.daily + data.typeBreakdown.monthly + data.typeBreakdown.large;
  const typeCards = [
    { key: "daily" as const, label: "Daily", value: data.typeBreakdown.daily },
    { key: "monthly" as const, label: "Monthly Fixed", value: data.typeBreakdown.monthly },
    { key: "large" as const, label: "Large Purchases", value: data.typeBreakdown.large },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="mt-1 text-slate-400">Your financial overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 stagger-children">
        {summaryCards.map((card) => (
          <Card key={card.label} padding="sm" className="hover-lift">
            <div className="flex items-center gap-2">
              <span className={`text-lg ${card.color}`}>{card.icon}</span>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {card.label}
              </p>
            </div>
            <AnimatedCounter
              value={card.value}
              currency={currency}
              className={`mt-2 block text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100`}
            />
          </Card>
        ))}
      </div>

      {/* Type Breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        {typeCards.map((tc) => {
          const colors = TYPE_COLORS[tc.key.toUpperCase()] ?? TYPE_COLORS.DAILY;
          const pct = totalTypeSpend > 0 ? (tc.value / totalTypeSpend) * 100 : 0;
          return (
            <Card key={tc.key} padding="sm" className="hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                    {colors.label}
                  </span>
                  <p className={`mt-2 text-lg font-bold ${colors.text}`}>
                    {formatCurrency(tc.value, currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-400">{pct.toFixed(0)}%</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${colors.bg.replace("/10", "/60")}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      {data.quickStats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card padding="sm" className="hover-lift">
            <p className="text-xs uppercase text-slate-400">Avg Daily Spend</p>
            <p className="mt-1 text-lg font-bold text-ai-accent">
              {formatCurrency(data.quickStats.avgDailySpend, currency)}
            </p>
          </Card>
          <Card padding="sm" className="hover-lift">
            <p className="text-xs uppercase text-slate-400">Top Category</p>
            <p className="mt-1 text-lg font-bold text-slate-200">
              {data.quickStats.topCategory ?? "—"}
            </p>
          </Card>
          <Card padding="sm" className="hover-lift">
            <p className="text-xs uppercase text-slate-400">Biggest Expense</p>
            <p className="mt-1 text-lg font-bold text-expense">
              {data.quickStats.biggestExpense
                ? `${formatCurrency(data.quickStats.biggestExpense.amount, currency)}`
                : "—"}
            </p>
            {data.quickStats.biggestExpense && (
              <p className="text-xs text-slate-400">{data.quickStats.biggestExpense.category}</p>
            )}
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending Trends */}
        <Card>
          <CardHeader title="Spending Trends" description="Last 6 months" />
          <CardBody>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" tick={{ fill: textFill, fontSize: 12 }} />
                <YAxis tick={{ fill: textFill, fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12 }}
                  labelStyle={{ color: tooltipLabel }}
                />
                <Area type="monotone" dataKey="income" stackId="1" stroke="#30d158" fill="#30d15833" name="Income" />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ff453a" fill="#ff453a33" name="Expenses" />
                <Area type="monotone" dataKey="savings" stackId="3" stroke="#5e5ce6" fill="#5e5ce633" name="Savings" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader title="Category Breakdown" description="Current month" />
          <CardBody>
            {data.categoryBreakdown.length === 0 ? (
              <p className="py-12 text-center text-slate-400">No expenses this month</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {data.categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12 }}
                    formatter={(value) => formatCurrency(Number(value), currency)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* AI Insights */}
      <AIInsightsCard />

      {/* Recent Expenses */}
      <Card>
        <CardHeader title="Recent Expenses" description="Last 5 transactions" />
        <CardBody>
          {data.recentExpenses.length === 0 ? (
            <p className="text-slate-400">No expenses yet.</p>
          ) : (
            <div className="divide-y divide-slate-800">
              {data.recentExpenses.map((exp) => {
                const typeColor = TYPE_COLORS[exp.type] ?? TYPE_COLORS.DAILY;
                return (
                  <div key={exp.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColor.bg} ${typeColor.text}`}>
                        {typeColor.label}
                      </span>
                      <div>
                        <p className="font-medium text-slate-100">{exp.category}</p>
                        <p className="text-sm text-slate-400">
                          {format(new Date(exp.date), "MMM d, yyyy")} · {exp.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-expense">
                      -{formatCurrency(exp.amount, currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
