"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

// Custom hook to trigger scroll reveals using IntersectionObserver
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);
}

/* ──────────────────────────── SVG ICONS ──────────────────────────── */

function WalletIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h.75A2.25 2.25 0 0118 6v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

/* ──────────────────────────── SUB-COMPONENTS ──────────────────────────── */

function MockDashboard() {
  const transactions = [
    { name: "Groceries", amount: -2450, icon: "🛒", time: "Today" },
    { name: "Salary Credit", amount: 54000, icon: "💼", time: "Yesterday" },
    { name: "Dining Out", amount: -1200, icon: "🍽️", time: "2d ago" },
    { name: "Rent Transfer", amount: -12000, icon: "🏠", time: "3d ago" },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border border-white/[0.08] bg-[#1c1c1e]/40 dark:bg-[#1c1c1e]/40 light:bg-white/70 light:border-zinc-200/80 p-6 sm:p-8 shadow-[0_30px_100px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all duration-700 ease-[var(--ease-apple)] hover:scale-[1.01] hover:border-white/[0.15]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] sm:text-[11px] font-semibold text-muted uppercase tracking-wider mb-0.5">Overview</p>
          <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Clarity Dashboard</h3>
        </div>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff453a]/20 border border-[#ff453a]/40" />
          <span className="w-3 h-3 rounded-full bg-[#ff9f0a]/20 border border-[#ff9f0a]/40" />
          <span className="w-3 h-3 rounded-full bg-[#30d158]/20 border border-[#30d158]/40" />
        </div>
      </div>

      {/* Balance Block */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl bg-white/[0.02] dark:bg-white/[0.02] light:bg-zinc-50 border border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/50 p-5">
          <p className="text-xs text-muted font-normal mb-1">Available Balance</p>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            +₹51,700<span className="text-sm font-normal text-muted">.00</span>
          </p>
          <span className="mt-2 inline-flex items-center text-[10px] font-medium text-income bg-income/10 px-2 py-0.5 rounded-full">
            +12.4% vs last month
          </span>
        </div>
        <div className="rounded-2xl bg-white/[0.02] dark:bg-white/[0.02] light:bg-zinc-50 border border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/50 p-5">
          <p className="text-xs text-muted font-normal mb-1">Savings Goal Progress</p>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            68%<span className="text-xs sm:text-sm font-normal text-muted ml-1.5">Emergency Fund</span>
          </p>
          <div className="mt-4.5 w-full bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-200/60 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: "68%" }} />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Recent Flow</p>
          <span className="text-xs text-accent hover:underline cursor-pointer">Explore Ledger</span>
        </div>
        {transactions.map((tx) => (
          <div
            key={tx.name}
            className="flex items-center justify-between rounded-xl bg-white/[0.01] dark:bg-white/[0.01] light:bg-zinc-50/50 px-4 py-3.5 border border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/40 hover:border-white/[0.08] dark:hover:border-white/[0.08] light:hover:border-zinc-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg bg-white/[0.03] dark:bg-white/[0.03] light:bg-white p-2 rounded-xl border border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/30">
                {tx.icon}
              </span>
              <div>
                <p className="text-xs sm:text-sm font-medium text-foreground">{tx.name}</p>
                <p className="text-[10px] text-muted">{tx.time}</p>
              </div>
            </div>
            <span
              className={`text-xs sm:text-sm font-medium tabular-nums ${
                tx.amount > 0 ? "text-income" : "text-foreground"
              }`}
            >
              {tx.amount > 0 ? "+" : "-"}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  children,
  badge,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  badge?: string;
  className?: string;
}) {
  return (
    <div
      className={`group relative rounded-[2rem] border border-white/[0.06] dark:border-white/[0.06] light:border-zinc-200 bg-white/[0.01] dark:bg-white/[0.01] light:bg-white p-8 sm:p-10 transition-all duration-700 ease-[var(--ease-apple)] hover:scale-[1.01] hover:border-white/[0.15] dark:hover:border-white/[0.15] light:hover:border-zinc-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col justify-between ${className}`}
    >
      {badge && (
        <span className="absolute top-6 right-6 rounded-full bg-accent/10 dark:bg-accent/15 border border-accent/20 dark:border-accent/30 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-accent">
          {badge}
        </span>
      )}
      <div>
        <div className="mb-6 inline-flex items-center justify-center rounded-2xl bg-accent/5 dark:bg-accent/10 p-3 text-accent border border-accent/10 dark:border-accent/20 transition-all duration-500 group-hover:scale-105">
          {icon}
        </div>
        <h3 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-3">{title}</h3>
        <p className="text-xs sm:text-sm text-muted leading-relaxed mb-6 font-normal max-w-md">{description}</p>
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}

function PersonalFinanceMini() {
  const categories = [
    { name: "Rent & Bills", pct: 38, color: "bg-accent" },
    { name: "Groceries", pct: 29, color: "bg-[#30d158]" },
    { name: "Dining Out", pct: 18, color: "bg-[#ff9f0a]" },
    { name: "Others", pct: 15, color: "bg-[#bf5af2]" },
  ];

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Income", val: "₹54K", color: "text-[#30d158]" },
          { label: "Expenses", val: "₹38K", color: "text-[#ff453a]" },
          { label: "Saved", val: "₹16K", color: "text-accent" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-white/[0.01] dark:bg-white/[0.01] light:bg-zinc-50 border border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/50 p-3.5 text-center">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className={`text-sm font-semibold ${item.color}`}>{item.val}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 bg-white/[0.01] dark:bg-white/[0.01] light:bg-zinc-50/50 border border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/50 rounded-2xl p-4">
        {categories.map((cat) => (
          <div key={cat.name} className="flex items-center gap-3">
            <span className="text-[11px] text-foreground w-20 shrink-0 font-medium">{cat.name}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-200/60 overflow-hidden">
              <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${cat.pct}%` }} />
            </div>
            <span className="text-[10px] text-muted w-8 text-right font-medium">{cat.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupSplitMini() {
  const members = [
    { name: "You", avatar: "🧑", share: "₹750", active: true },
    { name: "Priya", avatar: "👩", share: "₹750", active: false },
    { name: "Ravi", avatar: "🧔", share: "₹750", active: false },
    { name: "Aisha", avatar: "👧", share: "₹750", active: false },
  ];

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl bg-white/[0.01] dark:bg-white/[0.01] light:bg-zinc-50 border border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              🍕 Weekend Pizza Night
            </h4>
            <p className="text-[10px] text-muted mt-0.5">Split equally among members · Total: ₹3,000</p>
          </div>
          <span className="rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5 text-[9px] font-semibold text-accent uppercase tracking-wider">
            Equal
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {members.map((m) => (
            <div
              key={m.name}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-all ${
                m.active
                  ? "bg-accent/5 border-accent/20"
                  : "bg-white/[0.02] dark:bg-white/[0.02] light:bg-white border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200"
              }`}
            >
              <span className="text-sm">{m.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-foreground font-medium truncate">{m.name}</p>
              </div>
              <span className="text-[10px] font-semibold text-muted">{m.share}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DebtSimplificationMini() {
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl bg-white/[0.01] dark:bg-white/[0.01] light:bg-zinc-50 border border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex -space-x-1.5">
            {["🧑", "👩", "🧔", "👧"].map((e, i) => (
              <span
                key={i}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-[#1c1c1e] text-xs ring-2 ring-black dark:ring-black light:ring-zinc-100 border border-zinc-200/30"
              >
                {e}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-muted font-medium">Goa Vacation Clan</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl bg-[#ff453a]/5 border border-[#ff453a]/10 p-3">
            <p className="text-[10px] text-[#ff453a] font-semibold uppercase tracking-wider mb-1">Before Algorithmic Optimization</p>
            <p className="text-[11px] text-muted">12 messy transactions required between friends</p>
          </div>
          <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-accent/10 border border-accent/20">
            <span className="text-accent text-sm font-semibold">&rarr;</span>
          </div>
          <div className="flex-1 rounded-xl bg-[#30d158]/5 border border-[#30d158]/10 p-3">
            <p className="text-[10px] text-[#30d158] font-semibold uppercase tracking-wider mb-1">Greedy Settlement Simplified</p>
            <p className="text-[11px] text-muted">Just 2 direct, clean settlements total</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIInsightsMini() {
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl bg-white/[0.01] dark:bg-white/[0.01] light:bg-zinc-50 border border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/50 p-5">
        <div className="flex gap-3">
          <span className="text-lg bg-accent/10 border border-accent/20 p-2.5 rounded-xl self-start">🤖</span>
          <div className="space-y-2">
            <p className="text-xs text-foreground leading-relaxed">
              Your spending in <span className="font-semibold text-[#ff9f0a]">Dining Out</span> has risen by 32% this month. Consider setting a cap of ₹5,000 to save an extra ₹2,400.
            </p>
            <div className="flex gap-1.5">
              <span className="rounded bg-accent/10 px-2 py-0.5 text-[9px] font-semibold text-accent uppercase tracking-wider">
                Behavior Insight
              </span>
              <span className="rounded bg-[#ff9f0a]/10 px-2 py-0.5 text-[9px] font-semibold text-[#ff9f0a] uppercase tracking-wider">
                Actionable
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityMini() {
  const badges = [
    { label: "Private Sessions", desc: "No telemetry" },
    { label: "Bcrypt Hashing", desc: "12 secure rounds" },
    { label: "Single-Use Links", desc: "Reset protection" },
    { label: "Strict Isolation", desc: "Row-level protection" },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-2.5">
      {badges.map((b) => (
        <div
          key={b.label}
          className="rounded-xl bg-white/[0.01] dark:bg-white/[0.01] light:bg-zinc-50 border border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/50 p-3.5 hover:border-white/[0.08]"
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#30d158]" />
            <h5 className="text-[10px] font-semibold text-foreground">{b.label}</h5>
          </div>
          <p className="text-[9px] text-muted">{b.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────── MAIN EXPORT ──────────────────────────── */

export function HomePageClient() {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 font-sans">
      <Navbar />

      <main className="overflow-hidden">
        {/* 1. HERO SECTION */}
        <section className="relative pt-36 pb-20 md:pt-48 md:pb-28 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase reveal-on-scroll">
              SpendClan
            </p>
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-foreground leading-[1.08] reveal-on-scroll">
              Manage finances. <br />
              <span className="bg-gradient-to-r from-accent to-[#bf5af2] bg-clip-text text-transparent">
                Smartly.
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted font-light max-w-2xl mx-auto leading-relaxed reveal-on-scroll">
              Personal clarity meets seamless group splitting. Balance your own budget while instantly resolving complex bills with friends — all in one premium interface.
            </p>
            <div className="flex justify-center items-center gap-6 pt-4 reveal-on-scroll">
              <Link href="/register" className="apple-button-primary !px-6 !py-2.5 !text-sm animate-float">
                Get Started Free
              </Link>
              <Link href="/login" className="apple-link text-sm">
                Sign In &rarr;
              </Link>
            </div>
          </div>

          {/* Interactive Mock Dashboard */}
          <div className="mt-16 sm:mt-20 md:mt-24 reveal-on-scroll">
            <MockDashboard />
          </div>
        </section>

        {/* 2. BENTO FEATURE GRID */}
        <section id="features" className="py-24 border-t border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/60 max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="max-w-3xl mb-16 space-y-3 reveal-on-scroll">
            <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Designed for Clarity</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              Everything you need to master your wealth.
            </h2>
            <p className="text-sm sm:text-base text-muted max-w-2xl leading-relaxed">
              We design tools that respect your attention and isolate your records. Settle debts dynamically and view analytics seamlessly.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Personal Finance Suite - Spans 2 cols */}
            <FeatureCard
              icon={<WalletIcon />}
              title="Personal Finance Suite"
              description="Track recurring expenses, log monthly incomes, outline strict budgets, and monitor savings goal metrics dynamically."
              className="sm:col-span-2 reveal-on-scroll"
            >
              <PersonalFinanceMini />
            </FeatureCard>

            {/* Smart Group Splits */}
            <FeatureCard
              icon={<UsersIcon />}
              title="Smart Bill Splitting"
              description="Split shared expenses with roommates, trips, and family. Supports equal, custom, or percentage distributions."
              className="reveal-on-scroll"
            >
              <GroupSplitMini />
            </FeatureCard>

            {/* Smart Debt Settlement */}
            <FeatureCard
              icon={<BoltIcon />}
              title="Algorithmic Settle"
              description="Our greedy matching algorithm reduces messy transaction pools into the absolute minimum payments."
              className="reveal-on-scroll"
            >
              <DebtSimplificationMini />
            </FeatureCard>

            {/* AI Insights */}
            <FeatureCard
              icon={<SparklesIcon />}
              title="Intelligent Insights"
              description="Personalized, contextual financial warnings and reports to help you reduce expenses and build passive savings."
              badge="Coming Soon"
              className="reveal-on-scroll"
            >
              <AIInsightsMini />
            </FeatureCard>

            {/* Security */}
            <FeatureCard
              icon={<ShieldIcon />}
              title="Strict Privacy & Isolation"
              description="We respect your data. SpendClan uses total session boundaries and hashes records securely."
              className="reveal-on-scroll"
            >
              <SecurityMini />
            </FeatureCard>
          </div>
        </section>

        {/* 3. VALUE PROPS ROW */}
        <section id="why-spendclan" className="py-24 border-t border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/60 max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mb-16 space-y-3 reveal-on-scroll">
            <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Designed for Performance</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              Built on uncompromising standards.
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "⚡", title: "Sub-Second Load", desc: "Built with Turbopack and React 19 for instantaneous navigation responses." },
              { icon: "🏦", title: "Isolated Data", desc: "No tracker libraries or shared telemetry. Your transactions stay private." },
              { icon: "🎨", title: "Adaptive Canvas", desc: "Translucent glass components that dynamically morph to dark or light settings." },
              { icon: "📊", title: "Clear Analytics", desc: "Visualize budget progress and spending splits with high-contrast charts." },
            ].map((prop, idx) => (
              <div key={idx} className="space-y-3 reveal-on-scroll">
                <span className="text-2xl inline-block mb-1">{prop.icon}</span>
                <h4 className="text-base font-semibold text-foreground tracking-tight">{prop.title}</h4>
                <p className="text-xs sm:text-sm text-muted leading-relaxed font-normal">{prop.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. SECURITY ROW */}
        <section id="security" className="py-24 border-t border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/60 max-w-6xl mx-auto px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="space-y-6 reveal-on-scroll">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20">
                <ShieldIcon />
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-tight">
                Secure wealth coordination. Period.
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-muted leading-relaxed max-w-lg">
                SpendClan enforces strict row-level isolation policies. Your account dashboard queries verify session tokens against database models atomically. Your credentials are encrypted with 12 rounds of bcrypt hashing, preventing brute-force calculations.
              </p>
              <div className="pt-2">
                <Link href="/about" className="apple-link text-sm">
                  Learn about our privacy standards &rarr;
                </Link>
              </div>
            </div>
            <div className="rounded-[2.5rem] bg-white/[0.01] dark:bg-white/[0.01] light:bg-white border border-white/[0.06] dark:border-white/[0.06] light:border-zinc-200 p-8 sm:p-10 space-y-6 reveal-on-scroll">
              {[
                { title: "Zero Data Sharing", desc: "No telemetry trackers, third-party analytics scripts, or cookie trackers are installed." },
                { title: "One-Time Password Recovery", desc: "Hashed security questions and email tokens with strict single-use limits." },
                { title: "Advanced Cascading Purges", desc: "Deleting an account permanently removes all personal and group data instantly." },
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted leading-relaxed pl-3.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. CTA SECTION */}
        <section className="py-24 md:py-36 border-t border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/60 text-center max-w-4xl mx-auto px-6">
          <div className="space-y-6 reveal-on-scroll">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground leading-tight">
              Ready to take control?
            </h2>
            <p className="text-base sm:text-lg text-muted max-w-xl mx-auto font-light leading-relaxed">
              Join SpendClan today. Completely free for personal budgets and small friend groups.
            </p>
            <div className="flex justify-center items-center gap-6 pt-4">
              <Link href="/register" className="apple-button-primary !px-8 !py-3 !text-sm">
                Get Started Free
              </Link>
              <Link href="/about" className="apple-link text-sm">
                Read core philosophy &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
