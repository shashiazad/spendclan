import type { ReactNode } from "react";
import Link from "next/link";
import { BrandIcon } from "@/components/Navbar";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 transition-colors duration-300">
      
      {/* Left Column / Visual Brand Graphic (Web App / Desktop only) */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-between p-12 bg-slate-950 border-r border-slate-900/40 relative overflow-hidden auth-gradient">
        {/* Glowing Ambient Lights */}
        <div className="absolute -left-24 -top-24 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl animate-pulse-glow" style={{ animationDuration: "6s" }} />
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl animate-pulse-glow" style={{ animationDuration: "8s" }} />
        
        {/* Brand Link */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/25 group-hover:scale-105 transition-transform duration-300">
              <BrandIcon className="h-6 w-6 text-accent" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Spend<span className="font-normal text-muted">Clan</span>
            </span>
          </Link>
        </div>

        {/* Center Graphic: Shared Bill Settlement Bento Card */}
        <div className="relative z-10 my-auto max-w-lg mx-auto w-full animate-slide-up">
          <div className="glass-card p-6 rounded-2xl border border-white/[0.06] shadow-2xl bg-black/40 relative overflow-hidden">
            {/* Header of Bento Mock */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Active Pocket</span>
                <h3 className="text-base font-bold text-foreground mt-0.5">🏕️ Weekend Trip split</h3>
              </div>
              <span className="bg-accent/10 text-accent text-[10px] px-2.5 py-1 rounded-full font-medium border border-accent/20">
                Active Ledger
              </span>
            </div>

            {/* Split statistics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3.5 bg-black/60 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-muted block">Total Spent</span>
                <span className="text-lg font-bold text-foreground">₹14,850.00</span>
              </div>
              <div className="p-3.5 bg-black/60 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-muted block">Your Share</span>
                <span className="text-lg font-bold text-accent">₹4,950.00</span>
              </div>
            </div>

            {/* Visual branching nodes of split */}
            <div className="space-y-4 pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Penny-Perfect Settlements</span>
              
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs p-2.5 bg-black/40 rounded-lg border border-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent" />
                    <span className="text-foreground">Amit Verma</span>
                  </div>
                  <span className="text-muted text-[10px]">owes Priya</span>
                  <span className="font-semibold text-expense">₹2,450.00</span>
                </div>

                <div className="flex items-center justify-between text-xs p-2.5 bg-black/40 rounded-lg border border-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-income" />
                    <span className="text-foreground">Priya Sharma</span>
                  </div>
                  <span className="text-muted text-[10px]">owes You</span>
                  <span className="font-semibold text-income">₹1,200.00</span>
                </div>
              </div>
            </div>
            
            {/* Visual Node Split Graphic Overlay */}
            <div className="absolute -right-6 -bottom-6 opacity-20 pointer-events-none">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="text-accent">
                <circle cx="60" cy="60" r="40" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx="60" cy="20" r="6" fill="currentColor" />
                <circle cx="25" cy="80" r="6" fill="currentColor" />
                <circle cx="95" cy="80" r="6" fill="currentColor" />
                <line x1="60" y1="20" x2="25" y2="80" stroke="currentColor" strokeWidth="1" />
                <line x1="60" y1="20" x2="95" y2="80" stroke="currentColor" strokeWidth="1" />
                <line x1="25" y1="80" x2="95" y2="80" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom taglines & benefits */}
        <div className="relative z-10">
          <p className="text-sm font-semibold text-foreground mb-4">
            Premium Personal Finance &amp; Smart Group Splits.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-muted font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Isolated Data Security
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Zero Background AI Calls
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Penny-Perfect Splits
            </span>
          </div>
        </div>

      </div>

      {/* Right Column / Centered Login Card (Mobile: Full screen) */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-6 sm:p-12 relative bg-slate-950 auth-gradient">
        {/* Glow behind card on mobile */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none block md:hidden" />
        <div className="relative z-10 w-full flex justify-center">
          {children}
        </div>
      </div>
      
    </div>
  );
}
