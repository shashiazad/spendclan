import type { ReactNode } from "react";
import Link from "next/link";
import { BrandIcon } from "@/components/Navbar";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0b1120] text-slate-100 transition-colors duration-300">
      
      {/* Left Column / Visual Brand Graphic (Web App / Desktop only) */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-between p-12 bg-slate-950 border-r border-slate-900/40 relative overflow-hidden auth-gradient">
        {/* Glowing Ambient Lights */}
        <div className="absolute -left-24 -top-24 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl animate-pulse-glow" style={{ animationDuration: "6s" }} />
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl animate-pulse-glow" style={{ animationDuration: "8s" }} />
        
        {/* Brand Link */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 group-hover:scale-105 transition-transform duration-300">
              <BrandIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Spend<span className="text-emerald-400">Clan</span>
            </span>
          </Link>
        </div>

        {/* Center Graphic: Shared Bill Settlement Bento Card */}
        <div className="relative z-10 my-auto max-w-lg mx-auto w-full animate-slide-up">
          <div className="glass-card p-6 rounded-2xl border border-slate-800/80 shadow-2xl bg-slate-900/40 relative overflow-hidden">
            {/* Header of Bento Mock */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Pocket</span>
                <h3 className="text-lg font-bold text-white mt-0.5">🏕️ Weekend Trip split</h3>
              </div>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-medium ring-1 ring-emerald-500/20">
                Active Ledger
              </span>
            </div>

            {/* Split statistics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/50">
                <span className="text-xs text-slate-500 block">Total Spent</span>
                <span className="text-xl font-bold text-white">₹14,850.00</span>
              </div>
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/50">
                <span className="text-xs text-slate-500 block">Your Share</span>
                <span className="text-xl font-bold text-emerald-400">₹4,950.00</span>
              </div>
            </div>

            {/* Visual branching nodes of split */}
            <div className="space-y-4 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Penny-Perfect Settlements</span>
              
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm p-2.5 bg-slate-950/40 rounded-lg border border-slate-900/30">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    <span className="text-slate-300">Amit Verma</span>
                  </div>
                  <span className="text-slate-400 text-xs">owes Priya</span>
                  <span className="font-semibold text-rose-400">₹2,450.00</span>
                </div>

                <div className="flex items-center justify-between text-sm p-2.5 bg-slate-950/40 rounded-lg border border-slate-900/30">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-slate-300">Priya Sharma</span>
                  </div>
                  <span className="text-slate-400 text-xs">owes You</span>
                  <span className="font-semibold text-emerald-400">₹1,200.00</span>
                </div>
              </div>
            </div>
            
            {/* Visual Node Split Graphic Overlay */}
            <div className="absolute -right-6 -bottom-6 opacity-20 pointer-events-none">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="text-indigo-500">
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
          <p className="text-base font-semibold text-slate-300 mb-4">
            Premium Personal Finance &amp; Smart Group Splits.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Isolated Data Security
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Zero Background AI Calls
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Penny-Perfect Splits
            </span>
          </div>
        </div>

      </div>

      {/* Right Column / Centered Login Card (Mobile: Full screen) */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-6 sm:p-12 relative bg-[#0b1120] auth-gradient">
        {/* Glow behind card on mobile */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none block md:hidden" />
        <div className="relative z-10 w-full flex justify-center">
          {children}
        </div>
      </div>
      
    </div>
  );
}
