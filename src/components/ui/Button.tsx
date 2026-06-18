"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-500/50 disabled:bg-emerald-500/50 shadow-sm",
  secondary:
    "bg-white/70 dark:bg-zinc-900/70 text-slate-900 dark:text-slate-100 border border-zinc-200 dark:border-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-800/50 focus-visible:ring-slate-500/30 shadow-sm",
  ghost:
    "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:ring-slate-500/30",
  danger:
    "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 focus-visible:ring-red-500/50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm min-h-[36px]",
  md: "px-4 py-2 text-sm min-h-[44px]",
  lg: "px-6 py-2.5 text-base min-h-[44px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 ease-out hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
