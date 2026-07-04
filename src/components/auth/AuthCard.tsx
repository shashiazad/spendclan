import type { ReactNode } from "react";
import { BrandIcon } from "@/components/Navbar";

interface AuthCardProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="w-full max-w-md animate-slide-up">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
          <BrandIcon className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          SpendClan
        </h1>
        <h2 className="mt-2 text-base font-semibold text-[var(--foreground)]">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">{subtitle}</p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 shadow-[var(--shadow-lg)]">
        {children}
      </div>
    </div>
  );
}
