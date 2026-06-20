import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "About SpendClan — Privacy-First Financial Coordination",
  description: "SpendClan is built with one absolute rule: strict financial isolation. Your personal records are yours alone, and your shared balances use advanced algorithmic optimization to eliminate debt complexity instantly.",
};

export default async function AboutPage() {
  const session = await getSession();
  const isLoggedIn = !!session?.user?.id;
  
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 flex flex-col justify-between font-sans">
      <Navbar />
      
      <main className="flex-1 pt-36 pb-24 px-6 max-w-4xl mx-auto flex flex-col justify-center w-full">
        <div className="space-y-12 animate-slide-up">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
              Our Philosophy
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-tight">
              About SpendClan
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted max-w-xl mx-auto font-light leading-relaxed">
              Privacy-first financial isolation and automated coordination utilities.
            </p>
          </div>

          {/* Premium Apple-Style Frosted Card */}
          <div className="rounded-[2rem] border border-white/[0.06] dark:border-white/[0.06] light:border-zinc-200 bg-white/[0.01] dark:bg-white/[0.01] light:bg-white p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.02)] max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-4.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#30d158]/10 border border-[#30d158]/20">
                <svg
                  className="h-6 w-6 text-[#30d158]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground tracking-tight">Strict Financial Isolation</h2>
                <p className="text-[11px] text-muted font-normal uppercase tracking-wider mt-0.5">The Core Principle</p>
              </div>
            </div>

            <p className="text-sm sm:text-base text-muted leading-relaxed font-normal">
              SpendClan is built with one absolute rule: **strict financial isolation**. Your personal records are yours alone. We do not sell tracking profiles, load third-party analytics scripts, or expose your data to telemetry networks. 
              When you join shared groups, your balances use advanced algorithmic optimization to simplify debt paths down to the absolute fewest payments, preventing unnecessary financial friction.
            </p>

            <div className="pt-4 border-t border-white/[0.04] dark:border-white/[0.04] light:border-zinc-200/50 flex flex-col sm:flex-row items-center gap-4 justify-start">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto apple-button-primary !px-6 !py-2.5 !text-sm"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto apple-button-primary !px-6 !py-2.5 !text-sm animate-float"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="w-full sm:w-auto apple-button-secondary !px-6 !py-2.5 !text-sm"
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
