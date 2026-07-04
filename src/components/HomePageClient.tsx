"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("revealed");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));
    return () => elements.forEach((el) => observer.unobserve(el));
  }, []);
}

/* ─────────────── ICONS ─────────────── */
function WalletIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h.75A2.25 2.25 0 0118 6v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
function SparklesIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

/* ─────────────── MOCK DASHBOARD ─────────────── */
function MockDashboard() {
  const transactions = [
    { name: "Groceries",     amount: -2450,  icon: "🛒", time: "Today",     cat: "expense" },
    { name: "Salary Credit", amount:  54000, icon: "💼", time: "Yesterday", cat: "income" },
    { name: "Dining Out",    amount: -1200,  icon: "🍽️", time: "2d ago",    cat: "expense" },
    { name: "Rent Transfer", amount: -12000, icon: "🏠", time: "3d ago",    cat: "expense" },
  ];

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-xl)] overflow-hidden">
      {/* Window bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--expense)]/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--income)]/50" />
        <span className="ml-auto text-[10px] text-[var(--foreground-subtle)]">SpendClan Dashboard</span>
      </div>

      <div className="p-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Income",   value: "₹54K", color: "var(--income)" },
            { label: "Expenses", value: "₹38K", color: "var(--expense)" },
            { label: "Saved",    value: "₹16K", color: "var(--accent)" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
              <p className="text-[10px] text-[var(--foreground-subtle)] mb-1">{s.label}</p>
              <p className="text-sm font-semibold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Balance */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-4">
          <p className="text-[10px] text-[var(--foreground-muted)] mb-1">Available Balance</p>
          <p className="text-2xl font-semibold text-[var(--foreground)] tabular-nums">
            ₹51,700<span className="text-sm font-normal text-[var(--foreground-muted)]">.00</span>
          </p>
          <div className="mt-3 h-1 w-full rounded-full bg-[var(--border)]">
            <div className="h-full w-[68%] rounded-full bg-[var(--accent)]" />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[10px] text-[var(--foreground-subtle)]">68% of savings goal</span>
            <span className="text-[10px] font-medium" style={{ color: "var(--income)" }}>+12.4%</span>
          </div>
        </div>

        {/* Recent transactions */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">Recent</p>
            <span className="text-[10px] text-[var(--accent)] cursor-pointer hover:opacity-75">View all</span>
          </div>
          <div className="space-y-1.5">
            {transactions.map((tx) => (
              <div key={tx.name} className="flex items-center justify-between rounded-lg px-3 py-2.5 border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{tx.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-[var(--foreground)]">{tx.name}</p>
                    <p className="text-[10px] text-[var(--foreground-subtle)]">{tx.time}</p>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{ color: tx.amount > 0 ? "var(--income)" : "var(--foreground-muted)" }}
                >
                  {tx.amount > 0 ? "+" : "-"}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── FEATURE CARD ─────────────── */
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
      className={`group relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 transition-all duration-200 hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-md)] overflow-hidden flex flex-col justify-between ${className}`}
    >
      {badge && (
        <span className="absolute top-5 right-5 rounded-md bg-[var(--accent-dim)] border border-[var(--accent)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          {badge}
        </span>
      )}
      <div>
        <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-[var(--accent-dim)] border border-[var(--accent)]/15 p-2.5 text-[var(--accent)]">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--foreground-muted)] leading-relaxed mb-5 font-normal">{description}</p>
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}

/* ─────────────── MINI COMPONENTS ─────────────── */
function PersonalFinanceMini() {
  const categories = [
    { name: "Rent & Bills", pct: 38, color: "var(--accent)" },
    { name: "Groceries",    pct: 29, color: "var(--income)" },
    { name: "Dining Out",   pct: 18, color: "var(--warning)" },
    { name: "Others",       pct: 15, color: "var(--foreground-muted)" },
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
        {categories.map((cat) => (
          <div key={cat.name} className="flex items-center gap-3 mb-2 last:mb-0">
            <span className="text-[11px] text-[var(--foreground-muted)] w-20 shrink-0">{cat.name}</span>
            <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, background: cat.color }} />
            </div>
            <span className="text-[10px] text-[var(--foreground-subtle)] w-7 text-right">{cat.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupSplitMini() {
  const members = [
    { name: "You",   avatar: "🧑", share: "₹750", active: true },
    { name: "Priya", avatar: "👩", share: "₹750", active: false },
    { name: "Ravi",  avatar: "🧔", share: "₹750", active: false },
    { name: "Aisha", avatar: "👧", share: "₹750", active: false },
  ];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[var(--foreground)]">🍕 Weekend Pizza Night</p>
        <span className="text-[10px] font-medium text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded-md">₹3,000</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {members.map((m) => (
          <div
            key={m.name}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 border ${
              m.active
                ? "bg-[var(--accent-dim)] border-[var(--accent)]/20"
                : "border-[var(--border)] bg-[var(--card)]"
            }`}
          >
            <span className="text-sm">{m.avatar}</span>
            <span className="text-[11px] text-[var(--foreground)] font-medium flex-1 truncate">{m.name}</span>
            <span className="text-[10px] text-[var(--foreground-muted)]">{m.share}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DebtSimplificationMini() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] text-[var(--foreground-muted)] mb-3 font-medium uppercase tracking-wider">Goa Vacation Clan</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg bg-[var(--expense-dim)] border border-[var(--expense)]/15 p-3">
          <p className="text-[10px] font-semibold text-[var(--expense)] mb-1">Before</p>
          <p className="text-[11px] text-[var(--foreground-muted)]">12 messy transactions</p>
        </div>
        <svg className="h-4 w-4 shrink-0 text-[var(--foreground-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
        <div className="flex-1 rounded-lg bg-[var(--income-dim)] border border-[var(--income)]/15 p-3">
          <p className="text-[10px] font-semibold text-[var(--income)] mb-1">After</p>
          <p className="text-[11px] text-[var(--foreground-muted)]">2 clean settlements</p>
        </div>
      </div>
    </div>
  );
}

function AIInsightsMini() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex gap-3">
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-dim)] border border-[var(--accent)]/15">
          <span className="text-sm">🤖</span>
        </div>
        <div>
          <p className="text-xs text-[var(--foreground)] leading-relaxed mb-2">
            Your spending in <span className="font-semibold text-[var(--warning)]">Dining Out</span> rose 32% this month. Setting a ₹5,000 cap could save ₹2,400.
          </p>
          <div className="flex gap-1.5">
            <span className="rounded-md bg-[var(--accent-dim)] px-2 py-0.5 text-[9px] font-semibold text-[var(--accent)] uppercase tracking-wider border border-[var(--accent)]/15">Insight</span>
            <span className="rounded-md bg-[var(--warning-dim)] px-2 py-0.5 text-[9px] font-semibold text-[var(--warning)] uppercase tracking-wider border border-[var(--warning)]/15">Actionable</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityMini() {
  const items = [
    { label: "Private Sessions",   desc: "No telemetry" },
    { label: "Bcrypt Hashing",     desc: "12 secure rounds" },
    { label: "Single-Use Links",   desc: "Reset protection" },
    { label: "Strict Isolation",   desc: "Row-level security" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((b) => (
        <div
          key={b.label}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--income)] shrink-0" />
            <p className="text-[10px] font-semibold text-[var(--foreground)]">{b.label}</p>
          </div>
          <p className="text-[9px] text-[var(--foreground-subtle)]">{b.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── DIVIDER ─────────────── */
function SectionDivider() {
  return <hr className="border-[var(--border)]" />;
}

/* ─────────────── MAIN EXPORT ─────────────── */
export function HomePageClient() {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />

      <main>
        {/* ── 1. HERO ── */}
        <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 max-w-6xl mx-auto px-6">
          {/* Subtle top glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-[var(--accent-dim)] to-transparent opacity-60" aria-hidden />

          <div className="relative text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 mb-6 reveal-on-scroll">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--income)]" />
              <span className="text-[11px] font-medium text-[var(--foreground-muted)]">Personal Finance · Group Splitting · AI Insights</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[var(--foreground)] leading-[1.1] mb-5 reveal-on-scroll">
              Manage money with{" "}
              <span
                className="bg-gradient-to-r bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, var(--accent), #818CF8)" }}
              >
                clarity.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-[var(--foreground-muted)] font-normal max-w-2xl mx-auto leading-relaxed mb-8 reveal-on-scroll">
              Personal expense tracking meets seamless group splitting. Keep your own budget clean while settling shared bills with friends — all in one place.
            </p>
            <div className="flex justify-center items-center gap-3 reveal-on-scroll">
              <Link href="/register" className="btn-primary">
                Get Started Free
              </Link>
              <Link href="/login" className="btn-secondary">
                Sign In
              </Link>
            </div>
          </div>

          {/* Mock Dashboard */}
          <div className="mt-16 sm:mt-20 reveal-on-scroll">
            <MockDashboard />
          </div>
        </section>

        <SectionDivider />

        {/* ── 2. FEATURES ── */}
        <section id="features" className="py-20 max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12 reveal-on-scroll">
            <p className="text-[11px] font-semibold tracking-widest text-[var(--foreground-subtle)] uppercase mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--foreground)] mb-3">
              Everything you need to master your finances.
            </h2>
            <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
              Built for people who want control over their money without the complexity.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<WalletIcon />}
              title="Personal Finance Suite"
              description="Track recurring expenses, log monthly income, set strict budgets, and monitor savings goals dynamically."
              className="sm:col-span-2 reveal-on-scroll"
            >
              <PersonalFinanceMini />
            </FeatureCard>

            <FeatureCard
              icon={<UsersIcon />}
              title="Smart Bill Splitting"
              description="Split shared expenses with roommates, trips, or family. Equal, custom, or percentage distributions."
              className="reveal-on-scroll"
            >
              <GroupSplitMini />
            </FeatureCard>

            <FeatureCard
              icon={<BoltIcon />}
              title="Algorithmic Settlement"
              description="Our greedy matching algorithm reduces complex IOUs into the absolute minimum number of payments."
              className="reveal-on-scroll"
            >
              <DebtSimplificationMini />
            </FeatureCard>

            <FeatureCard
              icon={<SparklesIcon />}
              title="AI Insights"
              description="Personalized, contextual financial warnings and reports to help you reduce expenses and build savings."
              badge="Coming Soon"
              className="reveal-on-scroll"
            >
              <AIInsightsMini />
            </FeatureCard>

            <FeatureCard
              icon={<ShieldIcon />}
              title="Privacy First"
              description="Zero telemetry, row-level data isolation, and bcrypt hashing. Your data belongs to you."
              className="reveal-on-scroll"
            >
              <SecurityMini />
            </FeatureCard>
          </div>
        </section>

        <SectionDivider />

        {/* ── 3. VALUE PROPS ── */}
        <section id="why-spendclan" className="py-20 max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12 reveal-on-scroll">
            <p className="text-[11px] font-semibold tracking-widest text-[var(--foreground-subtle)] uppercase mb-3">Why SpendClan</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--foreground)]">
              Built on uncompromising standards.
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "⚡", title: "Sub-Second Load",   desc: "Built with Turbopack and React 19 for instant navigation." },
              { icon: "🔒", title: "Isolated Data",      desc: "No tracker libraries. Your transactions stay private." },
              { icon: "🎨", title: "Adaptive UI",        desc: "Clean light and dark modes that adapt to your preference." },
              { icon: "📊", title: "Clear Analytics",    desc: "Visualize budget progress with high-contrast charts." },
            ].map((prop) => (
              <div key={prop.title} className="reveal-on-scroll">
                <span className="text-2xl inline-block mb-3">{prop.icon}</span>
                <h4 className="text-sm font-semibold text-[var(--foreground)] mb-1.5">{prop.title}</h4>
                <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">{prop.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <SectionDivider />

        {/* ── 4. SECURITY ── */}
        <section id="security" className="py-20 max-w-6xl mx-auto px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="space-y-5 reveal-on-scroll">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--income-dim)] text-[var(--income)] border border-[var(--income)]/20">
                <ShieldIcon />
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--foreground)] leading-snug">
                Secure by design.
              </h2>
              <p className="text-sm text-[var(--foreground-muted)] leading-relaxed max-w-md">
                SpendClan enforces strict row-level isolation. Session tokens are verified atomically. Credentials are encrypted with 12 rounds of bcrypt, preventing brute-force attacks.
              </p>
              <Link href="/about" className="apple-link text-sm">
                Learn about our security →
              </Link>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 reveal-on-scroll">
              {[
                { title: "Zero Data Sharing",          desc: "No telemetry, third-party analytics, or cookie trackers." },
                { title: "One-Time Password Recovery",  desc: "Hashed tokens with strict single-use expiry limits." },
                { title: "Cascading Account Purges",    desc: "Deleting an account permanently removes all data instantly." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="mt-0.5 h-4 w-4 shrink-0 inline-flex items-center justify-center rounded-full bg-[var(--income-dim)] text-[var(--income)]">
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--foreground)] mb-0.5">{item.title}</h4>
                    <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SectionDivider />

        {/* ── 5. CTA ── */}
        <section className="py-24 text-center max-w-3xl mx-auto px-6">
          <div className="space-y-5 reveal-on-scroll">
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--foreground)]">
              Ready to take control?
            </h2>
            <p className="text-base text-[var(--foreground-muted)] max-w-lg mx-auto leading-relaxed">
              Join SpendClan today. Completely free for personal budgets and small friend groups.
            </p>
            <div className="flex justify-center items-center gap-3 pt-2">
              <Link href="/register" className="btn-primary">
                Get Started Free
              </Link>
              <Link href="/about" className="btn-secondary">
                Read philosophy →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
