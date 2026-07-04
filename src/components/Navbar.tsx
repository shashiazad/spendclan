"use client";

import React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function BrandIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <img src="/logo.png" alt="SpendClan Logo" className={`${className} object-contain`} />
  );
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? "border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-md py-3"
          : "border-b border-transparent bg-transparent py-4"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="transition-opacity group-hover:opacity-80">
            <BrandIcon className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Spend<span className="font-normal text-[var(--foreground-muted)]">Clan</span>
          </span>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-7">
          {[
            { label: "Features", href: "/#features" },
            { label: "Why Us", href: "/#why-spendclan" },
            { label: "Security", href: "/#security" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors duration-150"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Auth + Theme */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors duration-150"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="btn-primary !text-xs !py-1.5 !px-3.5"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
