"use client";

import React from "react";
import Link from "next/link";

import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function BrandIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      {/* Wallet base */}
      <rect x="2" y="9" width="12" height="14" rx="2.5" stroke="currentColor" strokeWidth={2} />
      {/* Wallet clasp */}
      <path d="M14 17h-2.5a1.5 1.5 0 0 1-1.5-1.5v-1a1.5 1.5 0 0 1 1.5-1.5h2.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      {/* Trendline inside wallet (Expense Tracking & Savings) */}
      <path d="M5 17l2.5-2.5 2 2 3-3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Splitting Paths (Bill Splits & shared expenses) */}
      <path d="M14 16h6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M20 16l5-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M20 16l5 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      {/* Clan Nodes */}
      <circle cx="25" cy="10" r="2.5" fill="currentColor" />
      <circle cx="26" cy="16" r="2.5" fill="currentColor" />
      <circle cx="25" cy="22" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandIcon className="h-8 w-8 text-emerald-400 transition-transform duration-300 group-hover:scale-110" />
          <span className="text-xl font-bold tracking-tight text-white animate-fade-in">
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

        {/* Auth Buttons + Theme Toggle */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
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
