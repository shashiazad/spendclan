import type { ReactNode } from "react";
import Link from "next/link";
import { BrandIcon } from "@/components/Navbar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const POINTS = [
  { title: "Split any way", body: "Equally, by exact amounts, percentages or ratios." },
  { title: "Settle in fewer payments", body: "See exactly who should pay whom." },
  { title: "Private to your group", body: "Only members ever see a group's money." },
];

function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]">
      <BrandIcon className="h-8 w-8" />
      <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">SpendClan</span>
    </Link>
  );
}

/** Sign in, sign up and recovery: the form beside a short "why SpendClan" on wide screens. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--background)] text-[var(--foreground)]">
      <div className="ambient-mesh" aria-hidden="true" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 lg:pt-8">
        <Brand />
        <ThemeToggle />
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-16">
        {/* Why SpendClan (wide screens) */}
        <section aria-label="Why SpendClan" className="hidden lg:block">
          <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Split shared costs <span className="bg-accent-gradient bg-clip-text text-transparent">fairly</span>, settle up in seconds.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[var(--accent)]" aria-hidden="true">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="text-sm text-[var(--foreground-muted)]">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* A small preview of a group */}
          <div className="card mt-10 max-w-md p-5" aria-hidden="true">
            <div className="flex items-center justify-between">
              <p className="font-semibold">🏕️ Weekend trip</p>
              <span className="rounded-full bg-[var(--accent-dim)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]">4 people</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[var(--surface)] p-3">
                <p className="text-xs text-[var(--foreground-muted)]">Group spend</p>
                <p className="text-lg font-bold money">₹14,850.00</p>
              </div>
              <div className="rounded-xl bg-[var(--surface)] p-3">
                <p className="text-xs text-[var(--foreground-muted)]">You&apos;re owed</p>
                <p className="text-lg font-bold text-[var(--owed)] money">+ ₹1,200.00</p>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <p className="flex justify-between rounded-xl bg-[var(--surface)] px-3 py-2">
                <span>Amit pays Priya</span>
                <span className="font-semibold money">₹2,450.00</span>
              </p>
              <p className="flex justify-between rounded-xl bg-[var(--surface)] px-3 py-2">
                <span>Priya pays you</span>
                <span className="font-semibold text-[var(--owed)] money">₹1,200.00</span>
              </p>
            </div>
          </div>
        </section>

        <div className="flex justify-center lg:justify-end">{children}</div>
      </div>
    </div>
  );
}
