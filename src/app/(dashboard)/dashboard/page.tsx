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
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";

const monthsList = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("default", { month: "long" }),
}));

const yearsList = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i;
  return { value: String(y), label: String(y) };
});

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
  "#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6",
  "#06B6D4", "#EC4899", "#14B8A6", "#F97316", "#84CC16",
];

const typeConfig = {
  daily:   { label: "Daily Expenses",   color: "var(--accent)" },
  monthly: { label: "Monthly Fixed",    color: "var(--income)" },
  large:   { label: "Large Purchases",  color: "var(--warning)" },
};

const getBadgeStyle = (type: string) => {
  switch (type) {
    case "DAILY":   return "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/20";
    case "MONTHLY": return "bg-[var(--income-dim)] text-[var(--income)] border border-[var(--income)]/20";
    case "LARGE":
    default:        return "bg-[var(--warning-dim)] text-[var(--warning)] border border-[var(--warning)]/20";
  }
};

const getBadgeLabel = (type: string) => {
  switch (type) {
    case "DAILY":   return "Daily";
    case "MONTHLY": return "Monthly";
    case "LARGE":   return "Large";
    default:        return type;
  }
};

// Summary card config
const summaryConfig = [
  {
    key: "totalIncome" as const,
    label: "Total Income",
    color: "var(--income)",
    dotColor: "bg-[var(--income)]",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
      </svg>
    ),
  },
  {
    key: "totalExpenses" as const,
    label: "Total Expenses",
    color: "var(--expense)",
    dotColor: "bg-[var(--expense)]",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" />
      </svg>
    ),
  },
  {
    key: "remaining" as const,
    label: "Remaining",
    color: "var(--foreground)",
    dotColor: "bg-[var(--foreground-subtle)]",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "netWorth" as const,
    label: "Net Worth",
    color: "var(--accent)",
    dotColor: "bg-[var(--accent)]",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
      </svg>
    ),
  },
  {
    key: "othersOweYou" as const,
    label: "Others Owe",
    color: "var(--income)",
    dotColor: "bg-[var(--income)]",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    key: "youOwe" as const,
    label: "You Owe",
    color: "var(--warning)",
    dotColor: "bg-[var(--warning)]",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const currency = session?.user?.currency ?? "INR";

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<"personal" | "my-groups">("personal");
  const [reportMonth, setReportMonth] = useState(String(new Date().getMonth() + 1));
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  async function handleDownloadReport() {
    setDownloadingReport(true);
    setReportError(null);
    try {
      const endpoint = reportType === "personal" ? "/api/reports/personal" : "/api/reports/my-groups";
      const res = await fetch(`${endpoint}?month=${reportMonth}&year=${reportYear}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch report data");
      }
      const reportData = await res.json();
      
      const { generatePersonalPDF, generateMyGroupsPDF } = await import("@/lib/pdf-generator");
      
      if (reportType === "personal") {
        await generatePersonalPDF(reportData, currency);
      } else {
        await generateMyGroupsPDF(reportData, currency);
      }
      setShowReportModal(false);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to generate report";
      setReportError(errorMsg);
    } finally {
      setDownloadingReport(false);
    }
  }

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

  const gridStroke   = isLight ? "rgba(0,0,0,0.05)"     : "rgba(255,255,255,0.05)";
  const textFill     = isLight ? "#9CA3AF"               : "#6B6B72";
  const tooltipBg    = isLight ? "#FFFFFF"               : "#1A1A1D";
  const tooltipBdr   = isLight ? "rgba(0,0,0,0.08)"     : "rgba(255,255,255,0.08)";
  const tooltipColor = isLight ? "#0F0F11"               : "#F5F5F6";

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
    return <p className="text-[var(--foreground-muted)] text-sm">Failed to load dashboard.</p>;
  }

  const totalTypeSpend = data.typeBreakdown.daily + data.typeBreakdown.monthly + data.typeBreakdown.large;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Dashboard</h1>
          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setReportType("personal");
              setReportError(null);
              setShowReportModal(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Reports
          </Button>
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--income)]" />
            <span className="text-xs text-[var(--foreground-muted)]">Live</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 stagger-children">
        {summaryConfig.map((cfg) => {
          const value = data.summary[cfg.key];
          const isRemaining = cfg.key === "remaining";
          const dynamicColor = isRemaining
            ? value >= 0 ? "var(--income)" : "var(--expense)"
            : cfg.color;
          return (
            <Card key={cfg.key} padding="sm" className="hover-lift">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                  {cfg.label}
                </p>
                <span style={{ color: dynamicColor }}>
                  {cfg.icon}
                </span>
              </div>
              <span className="block text-lg font-semibold tabular-nums tracking-tight mt-1" style={{ color: dynamicColor }}>
                <AnimatedCounter
                  value={value}
                  currency={currency}
                  className=""
                />
              </span>
            </Card>
          );
        })}
      </div>

      {/* Type Breakdown */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(["daily", "monthly", "large"] as const).map((key) => {
          const value = data.typeBreakdown[key];
          const pct = totalTypeSpend > 0 ? (value / totalTypeSpend) * 100 : 0;
          const { label, color } = typeConfig[key];
          return (
            <Card key={key} padding="sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--foreground-muted)]">
                  {label}
                </p>
                <span className="text-xs font-semibold text-[var(--foreground-muted)] tabular-nums">
                  {pct.toFixed(0)}%
                </span>
              </div>
              <p className="text-base font-semibold text-[var(--foreground)] tabular-nums mb-3">
                {formatCurrency(value, currency)}
              </p>
              <div className="h-1 w-full rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      {data.quickStats && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card padding="sm">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
              Avg Daily Spend
            </p>
            <p className="text-base font-semibold text-[var(--foreground)] tabular-nums">
              {formatCurrency(data.quickStats.avgDailySpend, currency)}
            </p>
          </Card>
          <Card padding="sm">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
              Top Category
            </p>
            <p className="text-base font-semibold text-[var(--foreground)] truncate">
              {data.quickStats.topCategory ?? "—"}
            </p>
          </Card>
          <Card padding="sm">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
              Biggest Expense
            </p>
            <p className="text-base font-semibold text-[var(--expense)] tabular-nums">
              {data.quickStats.biggestExpense
                ? formatCurrency(data.quickStats.biggestExpense.amount, currency)
                : "—"}
            </p>
            {data.quickStats.biggestExpense && (
              <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                {data.quickStats.biggestExpense.category}
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Trends */}
        <Card>
          <CardHeader
            title="Spending Trends"
            description="Last 6 months"
          />
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.trends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="1 6" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: textFill, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: textFill, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: tooltipBg,
                    border: `1px solid ${tooltipBdr}`,
                    borderRadius: "10px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    padding: "10px 14px",
                  }}
                  labelStyle={{ color: tooltipColor, fontSize: "11px", fontWeight: "600", marginBottom: "4px" }}
                  itemStyle={{ fontSize: "11px", color: tooltipColor }}
                />
                <Area type="monotone" dataKey="income"   stroke="#22C55E" strokeWidth={1.5} fill="url(#gIncome)"   name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={1.5} fill="url(#gExpenses)" name="Expenses" />
                <Area type="monotone" dataKey="savings"  stroke="#6366F1" strokeWidth={1.5} fill="url(#gSavings)"  name="Savings" />
              </AreaChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="mt-3 flex items-center gap-5 px-1">
              {[
                { color: "#22C55E", label: "Income" },
                { color: "#EF4444", label: "Expenses" },
                { color: "#6366F1", label: "Savings" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-[10px] text-[var(--foreground-muted)]">{item.label}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Category Pie */}
        <Card>
          <CardHeader
            title="Category Breakdown"
            description="This month's distribution"
          />
          <CardBody>
            {data.categoryBreakdown.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center">
                <p className="text-sm text-[var(--foreground-subtle)]">No expenses this month</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={52}
                      paddingAngle={2}
                      labelLine={false}
                    >
                      {data.categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: tooltipBg,
                        border: `1px solid ${tooltipBdr}`,
                        borderRadius: "10px",
                        padding: "10px 14px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      }}
                      itemStyle={{ fontSize: "11px", color: tooltipColor }}
                      formatter={(value) => formatCurrency(Number(value), currency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Category legend */}
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 px-1">
                  {data.categoryBreakdown.slice(0, 6).map((cat, i) => (
                    <div key={cat.category} className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2 w-2 shrink-0 rounded-sm"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-[10px] text-[var(--foreground-muted)] truncate">{cat.category}</span>
                    </div>
                  ))}
                </div>
              </>
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
            <p className="text-sm text-[var(--foreground-subtle)] py-4 text-center">No expenses yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.recentExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between py-3.5 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`shrink-0 inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${getBadgeStyle(exp.type)}`}
                    >
                      {getBadgeLabel(exp.type)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{exp.category}</p>
                      <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                        {format(new Date(exp.date), "MMM d, yyyy")} · {exp.paymentMethod}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-[var(--expense)] tabular-nums ml-4">
                    -{formatCurrency(exp.amount, currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Report Modal */}
      <Modal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Download PDF Expense Report"
        size="sm"
      >
        <div className="space-y-4">
          {reportError && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded-lg border border-red-200 dark:border-red-800">
              {reportError}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
              Report Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportType("personal")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  reportType === "personal"
                    ? "bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--sidebar-hover)]"
                }`}
              >
                Personal Report
              </button>
              <button
                type="button"
                onClick={() => setReportType("my-groups")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  reportType === "my-groups"
                    ? "bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--sidebar-hover)]"
                }`}
              >
                Consolidated Groups
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              options={monthsList}
            />
            <Select
              label="Year"
              value={reportYear}
              onChange={(e) => setReportYear(e.target.value)}
              options={yearsList}
            />
          </div>

          <div className="pt-2">
            <Button
              onClick={handleDownloadReport}
              className="w-full text-xs font-semibold"
              loading={downloadingReport}
            >
              Generate & Download PDF
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
