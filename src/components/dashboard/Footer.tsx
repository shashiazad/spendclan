import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-900/50 px-6 py-4">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-xs text-slate-500">
          &copy; {year} SpendClan. Personal finance made simple.
        </p>
        <div className="flex items-center gap-4">
          <p className="text-xs text-slate-600">
            Track expenses, income, savings &amp; group splits
          </p>
          <Link
            href="/about"
            className="text-xs text-slate-500 transition-colors hover:text-emerald-400"
          >
            About
          </Link>
        </div>
      </div>
    </footer>
  );
}
