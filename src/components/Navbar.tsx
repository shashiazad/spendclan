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
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${
        isScrolled
          ? "py-3 bg-black/70 dark:bg-black/70 light:bg-white/75 backdrop-blur-md border-white/[0.08] dark:border-white/[0.08] light:border-zinc-200/80 shadow-[0_4px_30px_rgba(0,0,0,0.03)]"
          : "py-5 bg-transparent border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <BrandIcon className="h-7 w-7 text-accent transition-transform duration-500 ease-[var(--ease-apple)] group-hover:scale-105" />
          <span className="text-lg font-semibold tracking-tight text-foreground transition-colors duration-300">
            Spend<span className="font-normal text-muted">Clan</span>
          </span>
        </Link>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {["Features", "Why SpendClan", "Security"].map((item) => (
            <a
              key={item}
              href={`/#${item.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-xs font-normal text-muted hover:text-foreground transition-colors duration-300"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Auth Buttons + Theme Toggle */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-xs font-normal text-muted hover:text-foreground transition-colors duration-300"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="apple-button-primary !px-4 !py-1.5 !text-xs"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
