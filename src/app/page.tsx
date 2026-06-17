import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SpendClan — Premium Expense Tracker & Smart Group Splits",
  description:
    "Manage your personal finances and split group expenses effortlessly. Track income, expenses, savings goals, and settle debts with friends — all in one premium platform.",
  keywords: [
    "expense tracker",
    "group splits",
    "personal finance",
    "bill splitting",
    "savings goals",
    "budget manager",
  ],
};

/* ──────────────────────────── SVG ICONS ──────────────────────────── */

function BrandIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      {/* Linked-nodes / split wallet icon */}
      <rect x="2" y="6" width="12" height="20" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <rect x="18" y="6" width="12" height="20" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" />
      <circle cx="24" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

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

function ChartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
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

function ArrowRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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

/* ──────────────────────────── NAVBAR ──────────────────────────── */

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandIcon className="h-8 w-8 text-emerald-400 transition-transform duration-300 group-hover:scale-110" />
          <span className="text-xl font-bold tracking-tight text-white">
            Spend<span className="text-emerald-400">Clan</span>
          </span>
        </Link>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {["Features", "Why SpendClan", "Security"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-sm font-medium text-slate-400 transition-colors duration-200 hover:text-white"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-300 transition-colors duration-200 hover:text-white"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:bg-emerald-400 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ──────────────────────────── HERO SECTION ──────────────────────────── */

function MockDashboard() {
  const transactions = [
    { name: "Groceries", amount: -2450, icon: "🛒", time: "Today" },
    { name: "Salary Credit", amount: 54000, icon: "💰", time: "Yesterday" },
    { name: "Dining Out", amount: -1200, icon: "🍽️", time: "2d ago" },
    { name: "Rent Transfer", amount: -12000, icon: "🏠", time: "3d ago" },
    { name: "Freelance Pay", amount: 15000, icon: "💼", time: "5d ago" },
  ];

  return (
    <div className="relative rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-2xl shadow-black/40 backdrop-blur-md">
      {/* Welcome header */}
      <div className="mb-5">
        <p className="text-xs text-slate-500 mb-0.5">Good Evening</p>
        <h3 className="text-lg font-bold text-white">Shashi 👋</h3>
      </div>

      {/* Balance card */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 p-4 mb-5">
        <p className="text-xs text-emerald-300/70 font-medium mb-1">Total Balance</p>
        <p className="text-3xl font-bold text-white tracking-tight">
          +₹51,700<span className="text-lg text-emerald-400">.00</span>
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
            ↑ 12.4%
          </span>
          <span className="text-xs text-slate-500">vs last month</span>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent</p>
          <span className="text-xs text-emerald-400 cursor-pointer hover:text-emerald-300">View all →</span>
        </div>
        {transactions.map((tx) => (
          <div
            key={tx.name}
            className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2.5 border border-slate-800/50"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">{tx.icon}</span>
              <div>
                <p className="text-sm font-medium text-slate-200">{tx.name}</p>
                <p className="text-xs text-slate-500">{tx.time}</p>
              </div>
            </div>
            <span
              className={`text-sm font-semibold tabular-nums ${
                tx.amount > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>

      {/* Floating CTA */}
      <button
        type="button"
        className="absolute -bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:bg-emerald-400 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
      >
        <span className="text-lg leading-none">+</span> New Transaction
      </button>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full bg-emerald-400/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left – Copy */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-300">Free forever for personal use</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight text-white mb-6">
              Manage Finances{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                Smartly.
              </span>
              <br />
              <span className="text-slate-300 text-3xl sm:text-4xl lg:text-[2.75rem] font-bold">
                Personal clarity meets seamless group splitting.
              </span>
            </h1>

            <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-xl">
              Shared lives shouldn&apos;t mean complicated math. SpendClan balances your personal budget
              while effortlessly erasing the awkwardness of group tabs — for friends, roommates,
              flatmates, trips, and family allocations.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:bg-emerald-400 hover:shadow-emerald-500/35 hover:-translate-y-0.5"
              >
                Get Started Free <ArrowRightIcon />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-7 py-3.5 text-base font-medium text-slate-300 transition-all duration-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white"
              >
                Sign In
              </Link>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              No card required. Free forever for personal use and small groups.
            </p>
          </div>

          {/* Right – Mock Dashboard */}
          <div className="animate-slide-up lg:animate-slide-in-right" style={{ animationDelay: "150ms" }}>
            <MockDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── BENTO FEATURE GRID ──────────────────────────── */

function FeatureCard({
  icon,
  title,
  children,
  badge,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  badge?: string;
  className?: string;
}) {
  return (
    <div
      className={`group relative rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 transition-all duration-300 hover:border-slate-700/80 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1 ${className}`}
    >
      {badge && (
        <span className="absolute top-4 right-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          {badge}
        </span>
      )}
      <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 ring-1 ring-emerald-500/20 transition-all duration-300 group-hover:bg-emerald-500/15 group-hover:ring-emerald-500/30">
        {icon}
      </div>
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      <div className="text-sm text-slate-400 leading-relaxed">{children}</div>
    </div>
  );
}

function PersonalFinanceMini() {
  const categories = [
    { name: "Groceries", pct: 35, color: "bg-emerald-400" },
    { name: "Dining Out", pct: 22, color: "bg-sky-400" },
    { name: "Rent", pct: 30, color: "bg-violet-400" },
    { name: "Other", pct: 13, color: "bg-amber-400" },
  ];

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-800/50 p-2 border border-slate-800/60">
          <p className="text-[10px] text-slate-500 uppercase">Income</p>
          <p className="text-sm font-bold text-emerald-400">₹54K</p>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-2 border border-slate-800/60">
          <p className="text-[10px] text-slate-500 uppercase">Expenses</p>
          <p className="text-sm font-bold text-red-400">₹38K</p>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-2 border border-slate-800/60">
          <p className="text-[10px] text-slate-500 uppercase">Saved</p>
          <p className="text-sm font-bold text-sky-400">₹16K</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {categories.map((cat) => (
          <div key={cat.name} className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-16 shrink-0">{cat.name}</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-800">
              <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${cat.pct}%` }} />
            </div>
            <span className="text-xs text-slate-500 w-7 text-right">{cat.pct}%</span>
          </div>
        ))}
      </div>
      {/* Savings Goal Arc */}
      <div className="flex items-center gap-3 rounded-lg bg-slate-800/40 p-2.5 border border-slate-800/50 mt-2">
        <svg className="h-10 w-10 shrink-0" viewBox="0 0 36 36">
          <path
            d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831"
            fill="none"
            stroke="#1e293b"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831"
            fill="none"
            stroke="#34d399"
            strokeWidth="3"
            strokeDasharray="68, 100"
            strokeLinecap="round"
          />
        </svg>
        <div>
          <p className="text-xs font-semibold text-slate-300">Emergency Fund</p>
          <p className="text-[10px] text-slate-500">₹68K / ₹1L · 68% complete</p>
        </div>
      </div>
    </div>
  );
}

function GroupSplitMini() {
  const members = [
    { name: "You", avatar: "🧑", share: "₹750" },
    { name: "Priya", avatar: "👩", share: "₹750" },
    { name: "Ravi", avatar: "🧔", share: "₹750" },
    { name: "Aisha", avatar: "👧", share: "₹750" },
  ];

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-800/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-slate-300">🍕 Weekend Dinner</p>
            <p className="text-[10px] text-slate-500">Total: ₹3,000</p>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
            Equal Split
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {members.map((m) => (
            <div key={m.name} className="flex items-center gap-1.5 rounded-md bg-slate-800/60 px-2 py-1.5">
              <span className="text-sm">{m.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-300 truncate">{m.name}</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">{m.share}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5">
        {["Equal", "Percentage", "Custom"].map((type) => (
          <span
            key={type}
            className={`flex-1 rounded-lg py-1.5 text-center text-[10px] font-medium transition-colors ${
              type === "Equal"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                : "bg-slate-800/50 text-slate-500 border border-slate-800/50"
            }`}
          >
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}

function DebtSimplificationMini() {
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-800/50">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex -space-x-1">
            {["🧑", "👩", "🧔", "👧", "👨"].map((e, i) => (
              <span key={i} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs ring-1 ring-slate-900">
                {e}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-slate-500">Goa Trip Group</span>
        </div>
        {/* Before */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 rounded bg-red-500/10 border border-red-500/20 p-2">
            <p className="text-[10px] text-red-400 font-medium">12 messy transactions</p>
            <div className="mt-1 flex flex-wrap gap-0.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-1 w-3 rounded-full bg-red-400/40" />
              ))}
            </div>
          </div>
          <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <div className="flex-1 rounded bg-emerald-500/10 border border-emerald-500/20 p-2">
            <p className="text-[10px] text-emerald-400 font-medium">2 clean payments</p>
            <div className="mt-1 flex gap-1">
              <div className="h-1.5 w-8 rounded-full bg-emerald-400/60" />
              <div className="h-1.5 w-6 rounded-full bg-emerald-400/60" />
            </div>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 text-center">
        Smart math · Penny-perfect accuracy
      </p>
    </div>
  );
}

function AIInsightsMini() {
  return (
    <div className="mt-4 space-y-2.5">
      <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-800/50">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-sm">🤖</span>
          <div className="space-y-1.5">
            <p className="text-xs text-slate-300 leading-relaxed">
              &ldquo;Your <span className="font-semibold text-amber-400">Dining Out</span> spending increased
              by <span className="font-semibold text-red-400">32%</span> this month. Consider setting a
              ₹5,000 monthly cap to save an extra ₹2,400.&rdquo;
            </p>
            <div className="flex gap-1">
              <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-medium text-violet-400">Smart Insight</span>
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">Actionable</span>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-800/50 opacity-60">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-sm">📊</span>
          <p className="text-xs text-slate-400 leading-relaxed">
            &ldquo;At your current savings rate of 29.6%, you&apos;ll reach your Emergency Fund goal by March 2027.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

function SecurityMini() {
  const badges = [
    { label: "Encrypted Sessions", desc: "Session Isolation" },
    { label: "Military-Grade Hash", desc: "Password Security" },
    { label: "One-Time Links", desc: "Single-Use Tokens" },
    { label: "Private Data Walls", desc: "Data Privacy" },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {badges.map((b) => (
        <div key={b.label} className="rounded-lg bg-slate-800/40 p-2.5 border border-slate-800/50">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <p className="text-[10px] font-semibold text-emerald-400">{b.label}</p>
          </div>
          <p className="text-[10px] text-slate-500">{b.desc}</p>
        </div>
      ))}
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-20 relative">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Everything You Need
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            A complete financial toolkit for personal budgets and group accountability.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 1. Personal Finance – Spans 2 columns on lg */}
          <FeatureCard
            icon={<WalletIcon />}
            title="Personal Finance Suite"
            className="lg:col-span-2"
          >
            <p>
              Track income, expenses, recurring bills, and savings goals in one unified dashboard.
              Category breakdowns, payment method tagging, and monthly trend analysis included.
            </p>
            <PersonalFinanceMini />
          </FeatureCard>

          {/* 2. Group Splitting */}
          <FeatureCard icon={<UsersIcon />} title="Smart Group Bill Splitting">
            <p>
              Split expenses with roommates, trip groups, and family. Choose Equal,
              Percentage, or Custom distributions for every bill.
            </p>
            <GroupSplitMini />
          </FeatureCard>

          {/* 3. Debt Simplification */}
          <FeatureCard icon={<BoltIcon />} title="Smart Debt Settlement">
            <p>
              Our algorithm simplifies complex group debts into the fewest possible
              clean transactions — no more messy IOUs.
            </p>
            <DebtSimplificationMini />
          </FeatureCard>

          {/* 4. AI Insights */}
          <FeatureCard icon={<SparklesIcon />} title="AI Financial Insights" badge="Coming Soon">
            <p>
              Automated, predictive analytics and personalized suggestions to optimize
              your spending habits and reach goals faster.
            </p>
            <AIInsightsMini />
          </FeatureCard>

          {/* 5. Security */}
          <FeatureCard icon={<ShieldIcon />} title="Bank-Grade Security">
            <p>
              Your financial data is protected with the same security standards used by banks and payment platforms.
            </p>
            <SecurityMini />
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── ARCHITECTURE SECTION ──────────────────────────── */

function WhySpendClanSection() {
  const benefits = [
    { icon: "⚡", name: "Instant-Load Performance", desc: "Blazing fast on mobile & desktop" },
    { icon: "🏦", name: "Bank-Grade Data Integrity", desc: "Every transaction recorded accurately" },
    { icon: "☁️", name: "Always Available", desc: "Your data synced and accessible 24/7" },
    { icon: "🔐", name: "Private by Default", desc: "Your finances are yours alone" },
    { icon: "🎨", name: "Beautiful & Responsive", desc: "Looks great on any screen size" },
    { icon: "📊", name: "Visual Insights", desc: "Understand your money at a glance" },
    { icon: "🌍", name: "Fast Everywhere", desc: "Global performance, zero lag" },
    { icon: "♻️", name: "Real-Time Updates", desc: "See changes as they happen" },
  ];

  return (
    <section id="why-spendclan" className="py-20 border-t border-slate-800/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Why SpendClan?
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Built for real people who want clarity, speed, and confidence in their finances.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div
              key={b.name}
              className="group rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all duration-300 hover:border-emerald-500/20 hover:bg-slate-900/80"
            >
              <span className="text-xl mb-1 block">{b.icon}</span>
              <p className="text-sm font-bold text-white mb-0.5 group-hover:text-emerald-400 transition-colors">{b.name}</p>
              <p className="text-xs text-slate-500">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── SECURITY SECTION ──────────────────────────── */

function SecuritySection() {
  return (
    <section id="security" className="py-20 border-t border-slate-800/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center justify-center rounded-xl bg-emerald-500/10 p-3 text-emerald-400 ring-1 ring-emerald-500/20 mb-5">
            <ShieldIcon />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Your Data, Fully Protected
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Every layer of SpendClan is designed with security-first principles.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Private Sessions",
              desc: "Your account is completely isolated and encrypted. No one else can see your data — not even other SpendClan users.",
              icon: "🔒",
            },
            {
              title: "Military-Grade Passwords",
              desc: "Your passwords and security answers are protected with industry-leading encryption — computationally impossible to crack.",
              icon: "🛡️",
            },
            {
              title: "One-Time Reset Links",
              desc: "Password reset links work exactly once and are destroyed immediately after use. No chance of replay or reuse.",
              icon: "💥",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 transition-all duration-300 hover:border-slate-700/80 hover:shadow-lg hover:shadow-black/20"
            >
              <span className="text-2xl mb-3 block">{item.icon}</span>
              <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── CTA SECTION ──────────────────────────── */

function CTASection() {
  return (
    <section className="py-20 border-t border-slate-800/50">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
          Ready to take control of your finances?
        </h2>
        <p className="text-lg text-slate-400 mb-8">
          Join SpendClan today. No card required. Free forever for personal use and small groups.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:bg-emerald-400 hover:shadow-emerald-500/35 hover:-translate-y-0.5"
        >
          Get Started Free <ArrowRightIcon />
        </Link>
      </div>
    </section>
  );
}

/* ──────────────────────────── FOOTER ──────────────────────────── */

function LandingFooter() {
  return (
    <footer className="border-t border-slate-800/50 py-8">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BrandIcon className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-semibold text-slate-400">
            SpendClan
          </span>
          <span className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()}
          </span>
        </div>
        <p className="text-xs text-slate-600">
          Built by{" "}
          <a
            href="https://github.com/shashiazad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-emerald-400 transition-colors"
          >
            Shashi Azad
          </a>
        </p>
      </div>
    </footer>
  );
}

/* ──────────────────────────── PAGE ──────────────────────────── */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <WhySpendClanSection />
        <SecuritySection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
