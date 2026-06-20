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
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-apple-text-primary">Dashboard</h1>
        <p className="mt-1.5 text-[10px] text-apple-text-secondary font-medium uppercase tracking-[0.15em]">Your Financial Overview</p>
      </div>

      {/* Summary Cards (Bento Grid) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 stagger-children">
        {summaryCards.map((card) => (
          <Card
            key={card.label}
            padding="sm"
            className="transition-apple hover:scale-[1.01] hover:border-zinc-300 dark:hover:border-[#3a3a3c] bg-apple-card border border-apple-border shadow-none"
          >
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-apple-text-tertiary">
                {card.label}
              </p>
              <span className={`text-[11px] font-semibold ${
                card.color.includes("income") ? "text-apple-green" : 
                card.color.includes("expense") ? "text-apple-red" : 
                card.color.includes("savings") ? "text-apple-blue" : "text-apple-text-secondary"
              }`}>{card.icon}</span>
            </div>
            <AnimatedCounter
              value={card.value}
              currency={currency}
              className="mt-3.5 block text-2xl font-bold tracking-tight text-apple-text-primary"
            />
          </Card>
        ))}
      </div>

      {/* Type Breakdown (iOS Storage/Battery style progress tracks) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {typeCards.map((tc) => {
          const colors = TYPE_COLORS[tc.key.toUpperCase()] ?? TYPE_COLORS.DAILY;
          const pct = totalTypeSpend > 0 ? (tc.value / totalTypeSpend) * 100 : 0;
          
          let barColor = "bg-apple-blue";
          if (tc.key === "daily") barColor = "bg-apple-green";
          if (tc.key === "large") barColor = "bg-apple-red";

          return (
            <Card
              key={tc.key}
              padding="sm"
              className="transition-apple hover:scale-[1.01] bg-apple-card border border-apple-border shadow-none"
            >
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-apple-text-tertiary block mb-1">
                    {tc.label}
                  </span>
                  <p className="text-xl font-bold text-apple-text-primary">
                    {formatCurrency(tc.value, currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold tracking-tight text-apple-text-secondary">{pct.toFixed(0)}%</p>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
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
          <Card padding="sm" className="transition-apple hover:scale-[1.01] bg-apple-card border border-apple-border shadow-none">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-apple-text-tertiary mb-1.5">Avg Daily Spend</p>
            <p className="text-lg font-bold text-apple-blue">
              {formatCurrency(data.quickStats.avgDailySpend, currency)}
            </p>
          </Card>
          <Card padding="sm" className="transition-apple hover:scale-[1.01] bg-apple-card border border-apple-border shadow-none">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-apple-text-tertiary mb-1.5">Top Category</p>
            <p className="text-lg font-bold text-apple-text-primary">
              {data.quickStats.topCategory ?? "—"}
            </p>
          </Card>
          <Card padding="sm" className="transition-apple hover:scale-[1.01] bg-apple-card border border-apple-border shadow-none">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-apple-text-tertiary mb-1.5">Biggest Expense</p>
            <p className="text-lg font-bold text-apple-red">
              {data.quickStats.biggestExpense
                ? `${formatCurrency(data.quickStats.biggestExpense.amount, currency)}`
                : "—"}
            </p>
            {data.quickStats.biggestExpense && (
              <p className="text-[10px] text-apple-text-secondary mt-0.5">{data.quickStats.biggestExpense.category}</p>
            )}
          </Card>
        </div>
      )}

      {/* Graphical Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending Trends */}
        <Card className="transition-apple bg-apple-card border border-apple-border shadow-none">
          <CardHeader title="Spending Trends" description="Last 6 months" />
          <CardBody>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.trends}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--apple-green)" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="var(--apple-green)" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--apple-red)" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="var(--apple-red)" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--apple-blue)" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="var(--apple-blue)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={gridStroke} />
                <XAxis dataKey="month" tick={{ fill: textFill, fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: textFill, fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, boxShadow: "none" }}
                  labelStyle={{ color: tooltipLabel, fontSize: 11, fontWeight: 600 }}
                  itemStyle={{ fontSize: 11 }}
                />
                <Area type="monotone" dataKey="income" stroke="var(--apple-green)" fill="url(#incomeGrad)" strokeWidth={1.8} name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="var(--apple-red)" fill="url(#expenseGrad)" strokeWidth={1.8} name="Expenses" />
                <Area type="monotone" dataKey="savings" stroke="var(--apple-blue)" fill="url(#savingsGrad)" strokeWidth={1.8} name="Savings" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Category Breakdown (Donut style) */}
        <Card className="transition-apple bg-apple-card border border-apple-border shadow-none">
          <CardHeader title="Category Breakdown" description="Current month" />
          <CardBody>
            {data.categoryBreakdown.length === 0 ? (
              <p className="py-12 text-center text-apple-text-secondary text-xs">No expenses this month</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={60}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {data.categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, boxShadow: "none" }}
                    formatter={(value) => formatCurrency(Number(value), currency)}
                    itemStyle={{ fontSize: 11 }}
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
      <Card className="bg-apple-card border border-apple-border shadow-none">
        <CardHeader title="Recent Expenses" description="Last 5 transactions" />
        <CardBody>
          {data.recentExpenses.length === 0 ? (
            <p className="text-apple-text-secondary text-xs">No expenses yet.</p>
          ) : (
            <div className="divide-y divide-apple-border/50">
              {data.recentExpenses.map((exp) => {
                const typeColor = TYPE_COLORS[exp.type] ?? TYPE_COLORS.DAILY;
                
                let badgeColor = "bg-apple-blue/10 text-apple-blue border border-apple-blue/20";
                if (exp.type === "DAILY") badgeColor = "bg-apple-green/10 text-apple-green border border-apple-green/20";
                if (exp.type === "LARGE") badgeColor = "bg-apple-red/10 text-apple-red border border-apple-red/20";

                return (
                  <div key={exp.id} className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${badgeColor}`}>
                        {typeColor.label}
                      </span>
                      <div>
                        <p className="font-semibold text-apple-text-primary text-xs sm:text-sm">{exp.category}</p>
                        <p className="text-[10px] text-apple-text-tertiary mt-0.5">
                          {format(new Date(exp.date), "MMM d, yyyy")} · {exp.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-apple-red text-xs sm:text-sm">
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
