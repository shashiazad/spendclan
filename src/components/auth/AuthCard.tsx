import type { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

/** The form card on sign-in, sign-up and recovery pages. Its title is the page heading. */
export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      <div className="card p-6 shadow-[var(--shadow-lg)] sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[var(--foreground-muted)]">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
