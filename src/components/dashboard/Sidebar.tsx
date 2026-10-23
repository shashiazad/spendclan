"use client";

/* eslint-disable @next/next/no-img-element -- the logo and profile photos are tiny static/data images */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const icon = (d: string) => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  groups: icon("M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"),
  expenses: icon("M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"),
  balances: icon("M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"),
  activity: icon("M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"),
  advisor: icon("M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"),
  profile: icon("M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"),
  about: icon("M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"),
  admin: icon("M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"),
  more: icon("M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"),
  signOut: icon("M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"),
};

/** The main sections: in the phone bottom bar, the tablet rail and the desktop sidebar. */
const PRIMARY: NavItem[] = [
  { href: "/groups", label: "Groups", icon: ICONS.groups },
  { href: "/expenses", label: "Expenses", icon: ICONS.expenses },
  { href: "/balances", label: "Balances", icon: ICONS.balances },
  { href: "/activity", label: "Activity", icon: ICONS.activity },
];

const SECONDARY: NavItem[] = [
  { href: "/advisor", label: "AI Advisor", icon: ICONS.advisor },
  { href: "/profile", label: "Profile", icon: ICONS.profile },
  { href: "/about", label: "About", icon: ICONS.about },
  { href: "/admin", label: "Admin", icon: ICONS.admin, adminOnly: true },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.role === "ADMIN";
  const secondary = SECONDARY.filter((item) => !item.adminOnly || isAdmin);
  const moreActive = secondary.some((i) => isActive(pathname, i.href));
  const user = session?.user;
  const person = user ? { id: user.id ?? "me", name: user.name ?? "?", profilePhoto: user.profilePhoto } : null;

  // The More drawer: focus moves in, Escape closes it, and focus returns to the button
  useEffect(() => {
    if (!moreOpen) return;
    drawer.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const button = moreButton.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [moreOpen]);

  const linkClass = (active: boolean) =>
    `flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${
      active
        ? "bg-[var(--sidebar-active)] font-semibold text-[var(--accent)]"
        : "text-[var(--foreground-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
    }`;

  const brand = (
    <Link href="/groups" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]">
      <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
      <span className="text-sm font-semibold tracking-tight text-[var(--foreground)]">SpendClan</span>
    </Link>
  );

  return (
    <>
      {/* ── Phones: top bar ── */}
      <header className="glass fixed inset-x-0 top-0 z-[var(--z-nav)] flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-x-0 border-t-0 px-4 pt-[env(safe-area-inset-top)] md:hidden">
        {brand}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {person && (
            <Link href="/profile" aria-label="Your profile" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]">
              <Avatar person={person} size="sm" />
            </Link>
          )}
        </div>
      </header>

      {/* ── Phones: floating glass bottom bar ── */}
      <nav
        aria-label="Primary"
        className="glass-nav fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[var(--z-nav)] flex h-16 items-stretch justify-around gap-1 rounded-2xl px-1.5 md:hidden"
      >
        {PRIMARY.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`my-1.5 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${
                active ? "bg-[var(--accent-dim)] font-semibold text-[var(--accent)]" : "text-[var(--foreground-muted)]"
              }`}
            >
              {item.icon}
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          ref={moreButton}
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          aria-controls="more-menu"
          className={`my-1.5 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${
            moreOpen || moreActive ? "bg-[var(--accent-dim)] font-semibold text-[var(--accent)]" : "text-[var(--foreground-muted)]"
          }`}
        >
          {ICONS.more}
          More
        </button>
      </nav>

      {/* ── Phones: More menu, just above the bottom bar ── */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-[var(--z-overlay)] bg-black/40 md:hidden" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div
            ref={drawer}
            id="more-menu"
            className="glass-panel fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[var(--z-modal)] rounded-2xl bg-[var(--surface-solid)] p-2 animate-slide-up md:hidden"
          >
            <nav aria-label="More">
              {secondary.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className={linkClass(isActive(pathname, item.href))}>
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm text-[var(--foreground-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--expense)]"
            >
              {ICONS.signOut}
              Sign out
            </button>
          </div>
        </>
      )}

      {/* ── Tablets: icon rail ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center gap-2 overflow-y-auto border-r border-[var(--border)] bg-[var(--sidebar-bg)] py-4 md:flex lg:hidden">
        <Link href="/groups" aria-label="SpendClan home" className="mb-2 rounded-lg">
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-col items-center gap-1">
          {[...PRIMARY, ...secondary].map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 w-16 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${
                  active ? "bg-[var(--sidebar-active)] font-semibold text-[var(--accent)]" : "text-[var(--foreground-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                }`}
              >
                {item.icon}
                <span className="max-w-full truncate px-1">{item.label.replace("AI ", "")}</span>
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Sign out"
          title="Sign out"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--expense)]"
        >
          {ICONS.signOut}
        </button>
      </aside>

      {/* ── Desktop: sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] lg:flex">
        <div className="flex h-16 shrink-0 items-center px-5">{brand}</div>
        <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {PRIMARY.map((item) => (
              <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined} className={linkClass(isActive(pathname, item.href))}>
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--foreground-subtle)]">More</p>
            {secondary.map((item) => (
              <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined} className={linkClass(isActive(pathname, item.href))}>
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="shrink-0 border-t border-[var(--border)] p-3">
          <div className="flex items-center gap-2">
            {person && (
              <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-[var(--sidebar-hover)]">
                <Avatar person={person} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-[var(--foreground)]">{user?.name}</span>
                  <span className="block truncate text-[11px] text-[var(--foreground-subtle)]">{user?.email}</span>
                </span>
              </Link>
            )}
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-1 flex min-h-[40px] w-full items-center gap-3 rounded-xl px-3 text-xs text-[var(--foreground-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--expense)]"
          >
            {ICONS.signOut}
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
