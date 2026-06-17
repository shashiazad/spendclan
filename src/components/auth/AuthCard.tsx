import type { ReactNode } from "react";
import { BrandIcon } from "@/components/Navbar";

interface AuthCardProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
          <BrandIcon className="h-6 w-6 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          SpendClan
        </h1>
        <h2 className="mt-3 text-lg font-semibold text-slate-100">{title}</h2>
        {subtitle && (
          <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-8 shadow-2xl shadow-black/30 backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}
