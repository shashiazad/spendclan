export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-900/50 px-6 py-4">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-xs text-slate-500">
          &copy; {year} Ledgerly. Personal finance made simple.
        </p>
        <p className="text-xs text-slate-600">
          Track expenses, income, savings &amp; group splits
        </p>
      </div>
    </footer>
  );
}
