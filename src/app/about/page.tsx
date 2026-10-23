import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "About SpendClan — Fair group expenses, kept private",
  description:
    "SpendClan splits shared costs fairly, settles groups in the fewest payments and keeps each group's records visible only to its members.",
};

const icon = (d: string) => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const PRINCIPLES: { title: string; body: string; icon: ReactNode; wide?: boolean }[] = [
  {
    title: "Private by default",
    body: "A group's expenses and balances are visible only to its members. No ads, no tracking scripts, no selling data. Every query checks that you're an active member of the group.",
    icon: icon("M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"),
    wide: true,
  },
  {
    title: "Fair to the paisa",
    body: "Split equally, by exact amounts, percentages or ratios. Shares always add up exactly; any leftover paisa goes to whoever paid.",
    icon: icon("M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47"),
  },
  {
    title: "Settle in fewer payments",
    body: "SpendClan works out who should pay whom so a group settles with the fewest transfers.",
    icon: icon("M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"),
  },
  {
    title: "Nothing gets lost",
    body: "Deleting an expense can be undone, every edit keeps the previous version, and only the person who added an expense can change it.",
    icon: icon("M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"),
  },
  {
    title: "Find anything",
    body: "Search every expense by text, amount, who paid, who's in it or when — or type shortcuts like paid:me >500.",
    icon: icon("M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"),
  },
];

const STEPS = [
  { title: "Create a group", body: "For your flat, a trip or a team. Invite people by name or email." },
  { title: "Add what you spend", body: "Say who paid and who it's for. Split any way you like." },
  { title: "Settle up", body: "See who owes whom and record payments as they happen." },
];

export default async function AboutPage() {
  const signedIn = !!(await getSession())?.user?.id;

  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--background)] text-[var(--foreground)]">
      <div className="ambient-mesh" aria-hidden="true" />
      <Navbar signedIn={signedIn} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-28 sm:px-6 sm:pt-36">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">About SpendClan</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Shared costs, <span className="bg-accent-gradient bg-clip-text text-transparent">without the awkwardness</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--foreground-muted)] sm:text-lg">
            SpendClan keeps track of what flatmates, travel buddies and teams spend together, splits it fairly and tells everyone
            exactly who owes whom — while keeping each group&apos;s money private to that group.
          </p>
        </section>

        <section aria-labelledby="principles" className="mt-16">
          <h2 id="principles" className="sr-only">What we stand for</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {PRINCIPLES.map((p) => (
              <article key={p.title} className={`card p-6 ${p.wide ? "md:col-span-2 md:row-span-1" : ""}`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">{p.icon}</span>
                <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)]">{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="how" className="mt-16">
          <h2 id="how" className="text-center text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
          <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="card p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-gradient text-sm font-bold text-white" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-[var(--foreground-muted)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="card mt-16 flex flex-col items-center gap-4 bg-[radial-gradient(120%_120%_at_50%_0%,var(--accent-dim),transparent_70%)] p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{signedIn ? "Back to your groups" : "Start splitting fairly"}</h2>
          <p className="max-w-xl text-sm text-[var(--foreground-muted)] sm:text-base">
            {signedIn ? "Your balances and recent activity are waiting." : "Free for flatmates, trips and small teams."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {signedIn ? (
              <Link href="/groups" className="inline-flex min-h-[48px] items-center rounded-xl bg-accent-gradient px-6 font-medium text-white hover:brightness-110">
                Open SpendClan
              </Link>
            ) : (
              <>
                <Link href="/register" className="inline-flex min-h-[48px] items-center rounded-xl bg-accent-gradient px-6 font-medium text-white hover:brightness-110">
                  Create a free account
                </Link>
                <Link href="/login" className="inline-flex min-h-[48px] items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 font-medium hover:border-[var(--border-hover)]">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
