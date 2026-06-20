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
import { formatCurrency } from "@/lib/constants";
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
  "#2997ff", "#30d158", "#ff9f0a", "#ff453a", "#bf5af2",
  "#0a84ff", "#64d2ff", "#bf5af2", "#ffd60a", "#ff375f", "#30d158",
];

const barColors = {
  daily: { bg: "bg-accent", text: "text-accent", label: "Daily Expenses" },
  monthly: { bg: "bg-income", text: "text-income", label: "Monthly Fixed" },
  large: { bg: "bg-muted-light", text: "text-foreground", label: "Large Purchases" },
};

const getBadgeStyles = (type: string) => {
  switch (type) {
    case "DAILY":
      return "bg-accent/10 text-accent border border-accent/20";
    case "MONTHLY":
      return "bg-income/10 text-income border border-income/20";
    case "LARGE":
    default:
      return "bg-white/5 text-muted border border-white/10 dark:border-white/5";
  }
};

const getBadgeLabel = (type: string) => {
  switch (type) {
    case "DAILY":
      return "Daily";
    case "MONTHLY":
      return "Monthly Fixed";
    case "LARGE":
      return "Large Purchase";
    default:
      return type;
  }
};

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

  const gridStroke = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)";
  const textFill = isLight ? "#8e8e93" : "#8e8e93";
  const tooltipBg = isLight ? "rgba(255, 255, 255, 0.8)" : "rgba(28, 28, 30, 0.8)";
  const tooltipBorder = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
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
    return <p className="text-muted">Failed to load dashboard.</p>;
  }

  const summaryCards = [
    { label: "Total Income", value: data.summary.totalIncome, color: "text-income", icon: "↑" },
    { label: "Total Expenses", value: data.summary.totalExpenses, color: "text-expense", icon: "↓" },
    { label: "Remaining", value: data.summary.remaining, color: data.summary.remaining >= 0 ? "text-income" : "text-expense", icon: "◎" },
    { label: "Net Worth", value: data.summary.netWorth, color: "text-accent", icon: "★" },
    { label: "Others Owe", value: data.summary.othersOweYou, color: "text-accent", icon: "←" },
    { label: "You Owe", value: data.summary.youOwe, color: "text-ai-accent", icon: "→" },
  ];

  const totalTypeSpend = data.typeBreakdown.daily + data.typeBreakdown.monthly + data.typeBreakdown.large;
  const typeCards = [
    { key: "daily" as const, value: data.typeBreakdown.daily },
    { key: "monthly" as const, value: data.typeBreakdown.monthly },
    { key: "large" as const, value: data.typeBreakdown.large },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-[10px] sm:text-[11px] font-semibold text-muted tracking-widest uppercase">Your Financial Overview</p>
      </div>

      {/* Summary Bento Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 stagger-children">
        {summaryCards.map((card) => (
          <Card key={card.label} padding="md" className="hover-lift hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300">
            <div className="flex items-center gap-2">
              <span className={`text-base font-semibold ${card.color}`}>{card.icon}</span>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">
                {card.label}
              </p>
            </div>
            <AnimatedCounter
              value={card.value}
              currency={currency}
              className="mt-3 block text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-none"
            />
          </Card>
        ))}
      </div>

      {/* Velocity / Type Breakdown Progress Bars (iOS System battery/storage look) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {typeCards.map((tc) => {
          const pct = totalTypeSpend > 0 ? (tc.value / totalTypeSpend) * 100 : 0;
          return (
            <Card key={tc.key} padding="md" className="hover-lift hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-[9px] font-semibold text-muted uppercase tracking-widest">
                  {barColors[tc.key].label}
                </span>
                <span className="text-sm font-semibold tracking-tight text-foreground tabular-nums">
                  {pct.toFixed(0)}%
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground mb-4 leading-none">
                {formatCurrency(tc.value, currency)}
              </p>
              {/* iOS-Style system storage/battery bar */}
              <div className="w-full bg-black/5 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-[var(--ease-apple)] ${barColors[tc.key].bg}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats Bento Cards */}
      {data.quickStats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card padding="md" className="hover-lift hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300">
            <p className="text-[9px] font-semibold text-muted uppercase tracking-widest">Avg Daily Spend</p>
            <p className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              {formatCurrency(data.quickStats.avgDailySpend, currency)}
            </p>
          </Card>
          <Card padding="md" className="hover-lift hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300">
            <p className="text-[9px] font-semibold text-muted uppercase tracking-widest">Top Category</p>
            <p className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
              {data.quickStats.topCategory ?? "—"}
            </p>
          </Card>
          <Card padding="md" className="hover-lift hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300">
            <p className="text-[9px] font-semibold text-muted uppercase tracking-widest">Biggest Expense</p>
            <p className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-expense">
              {data.quickStats.biggestExpense
                ? `${formatCurrency(data.quickStats.biggestExpense.amount, currency)}`
                : "—"}
            </p>
            {data.quickStats.biggestExpense && (
              <p className="text-[10px] text-muted mt-1 tracking-tight">{data.quickStats.biggestExpense.category}</p>
            )}
          </Card>
        </div>
      )}

      {/* Charts Bento Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending Trends with high-fidelity gradient & dotted grid lines */}
        <Card className="hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300">
          <CardHeader title="Spending Trends" description="Last 6 months breakdown" />
          <CardBody className="pt-2">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {/* Subtle translucent gradient fills */}
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#30d158" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#30d158" stopOpacity={0.005}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff453a" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#ff453a" stopOpacity={0.005}/>
                  </linearGradient>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2997ff" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#2997ff" stopOpacity={0.005}/>
                  </linearGradient>
                </defs>
                {/* Hair-thin dotted grid lines */}
                <CartesianGrid strokeDasharray="1 5" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: textFill, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: textFill, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: "16px",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
                  }}
                  labelStyle={{ color: tooltipLabel, fontSize: "11px", fontWeight: "600" }}
                  itemStyle={{ fontSize: "11px" }}
                />
                <Area type="monotone" dataKey="income" stroke="#30d158" strokeWidth={1.8} fill="url(#colorIncome)" name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#ff453a" strokeWidth={1.8} fill="url(#colorExpenses)" name="Expenses" />
                <Area type="monotone" dataKey="savings" stroke="#2997ff" strokeWidth={1.8} fill="url(#colorSavings)" name="Savings" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Category Breakdown */}
        <Card className="hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300">
          <CardHeader title="Category Breakdown" description="Current month expense distribution" />
          <CardBody className="pt-2">
            {data.categoryBreakdown.length === 0 ? (
              <p className="py-24 text-center text-muted text-xs">No expenses logged this month</p>
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
                    innerRadius={50} // Clean donut layout
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {data.categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: "16px",
                      backdropFilter: "blur(20px)",
                    }}
                    itemStyle={{ fontSize: "11px", color: tooltipLabel }}
                    formatter={(value) => formatCurrency(Number(value), currency)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* AI Insights Panel */}
      <AIInsightsCard />

      {/* Recent Expenses Ledger List */}
      <Card className="hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300">
        <CardHeader title="Recent Expenses" description="Last 5 transactions logged" />
        <CardBody>
          {data.recentExpenses.length === 0 ? (
            <p className="text-muted text-xs">No expenses yet.</p>
          ) : (
            <div className="divide-y divide-zinc-200/40 dark:divide-white/[0.04]">
              {data.recentExpenses.map((exp) => {
                return (
                  <div key={exp.id} className="flex items-center justify-between py-4 transition-colors hover:bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                      {/* Apple HIG custom styled muted tag */}
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-semibold ${getBadgeStyles(exp.type)}`}>
                        {getBadgeLabel(exp.type)}
                      </span>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-foreground">{exp.category}</p>
                        <p className="text-[10px] text-muted mt-0.5">
                          {format(new Date(exp.date), "MMM d, yyyy")} · {exp.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
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
