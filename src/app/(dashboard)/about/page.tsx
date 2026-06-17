import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Xpensio",
  description:
    "Learn about Xpensio, the personal finance and group expense management app built by Shashi Azad.",
};

export default function AboutPage() {
  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">About Xpensio</h1>
        <p className="mt-1 text-slate-400">
          Your personal finance companion
        </p>
      </div>

      {/* App info card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-8 shadow-2xl shadow-black/30 backdrop-blur-md animate-slide-up">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <svg
              className="h-7 w-7 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Xpensio</h2>
            <p className="text-sm text-slate-400">v0.1.0</p>
          </div>
        </div>

        <p className="text-slate-300 leading-relaxed mb-6">
          Xpensio is a modern, full-featured personal finance and group expense
          management web app. Track your daily expenses, income, recurring bills,
          savings goals, and split costs with friends — all in one place.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "💰",
              title: "Expense Tracking",
              desc: "Categorize daily, monthly, and large purchases with payment method tagging.",
            },
            {
              icon: "📈",
              title: "Income & Savings",
              desc: "Log income sources, set savings goals, and track your net worth over time.",
            },
            {
              icon: "👥",
              title: "Group Splits",
              desc: "Create pockets for shared expenses with equal, percentage, or custom splits.",
            },
            {
              icon: "🔁",
              title: "Recurring Expenses",
              desc: "Monitor subscriptions and recurring bills with overdue alerts.",
            },
            {
              icon: "🤖",
              title: "AI Advisor",
              desc: "Get personalized financial insights and spending analysis powered by AI.",
            },
            {
              icon: "📊",
              title: "Dashboard & Reports",
              desc: "Visualize trends with interactive charts and generate monthly reports.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 transition-colors hover:border-slate-700 hover:bg-slate-800/50"
            >
              <span className="text-2xl">{feature.icon}</span>
              <h3 className="mt-2 text-sm font-semibold text-slate-200">
                {feature.title}
              </h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-8 shadow-2xl shadow-black/30 backdrop-blur-md animate-slide-up" style={{ animationDelay: "100ms" }}>
        <h2 className="text-lg font-bold text-white mb-4">Tech Stack</h2>
        <div className="flex flex-wrap gap-2">
          {[
            "Next.js 16",
            "React 19",
            "TypeScript",
            "Tailwind CSS 4",
            "PostgreSQL 16",
            "Prisma 7",
            "NextAuth.js",
            "Recharts 3",
            "Gemini AI",
            "Vercel",
          ].map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Developer card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-8 shadow-2xl shadow-black/30 backdrop-blur-md animate-slide-up" style={{ animationDelay: "200ms" }}>
        <h2 className="text-lg font-bold text-white mb-6">Developer</h2>

        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar placeholder */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-violet-500/20 ring-1 ring-emerald-500/20">
            <span className="text-3xl font-bold text-emerald-400">SA</span>
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">Shashi Azad</h3>
            <p className="mt-1 text-sm text-slate-400">
              Full-stack developer passionate about building clean, modern web applications.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {/* GitHub */}
              <a
                href="https://github.com/shashiazad"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </a>

              {/* LinkedIn */}
              <a
                href="https://linkedin.com/in/shashiazad"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-blue-500/30 hover:bg-slate-800 hover:text-blue-400"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </a>

              {/* Portfolio */}
              <a
                href="https://shashiazad.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-violet-500/30 hover:bg-slate-800 hover:text-violet-400"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                Portfolio
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Back to dashboard link */}
      <div className="text-center">
        <Link
          href="/dashboard"
          className="text-sm text-slate-400 transition-colors hover:text-emerald-400"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
