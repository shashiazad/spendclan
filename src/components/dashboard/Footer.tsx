import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--card)] px-6 py-4">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-xs text-[var(--foreground-subtle)]">
          © {year} SpendClan. Group expenses made simple.
        </p>
        <div className="flex items-center gap-4">
          <p className="text-xs text-[var(--foreground-subtle)]">
            Split, track and settle group expenses
          </p>
          <Link
            href="/about"
            className="text-xs text-[var(--foreground-muted)] transition-colors hover:text-[var(--accent)]"
          >
            About
          </Link>
        </div>
      </div>
    </footer>
  );
}
