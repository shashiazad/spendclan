import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "About SpendClan",
  description: "SpendClan is built with one absolute rule: strict financial isolation. Your personal records are yours alone, and your shared balances use advanced algorithmic optimization to eliminate debt complexity instantly.",
};

export default async function AboutPage() {
  const session = await getSession();
  const isLoggedIn = !!session?.user?.id;
  
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between">
      <Navbar />
      <main className="flex-1 pt-32 pb-20 px-6 max-w-4xl mx-auto flex flex-col justify-center">
        <div className="animate-slide-up space-y-12">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
              About SpendClan
            </h1>
            <p className="text-lg text-slate-400 font-medium">
              Privacy-first financial isolation and utility
            </p>
          </div>

          {/* Premium Apple-Style Frosted Card */}
          <div className="rounded-3xl border border-zinc-100 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-8 sm:p-12 shadow-sm dark:shadow-md max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
                <svg
                  className="h-6 w-6 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Strict Financial Isolation</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Our Core Philosophy</p>
              </div>
            </div>

            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-200 leading-relaxed font-normal mb-8 text-center sm:text-left">
              SpendClan is built with one absolute rule: strict financial isolation. Your personal records are yours alone, and your shared balances use advanced algorithmic optimization to eliminate debt complexity instantly. No telemetry, no selling of data, just secure wealth coordination.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-start">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 px-6 py-3 text-sm font-semibold text-slate-900 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
