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
    "bg-[var(--accent)] text-white border border-transparent hover:bg-[var(--accent-hover)] focus-visible:ring-[var(--accent-ring)] disabled:opacity-50",
  secondary:
    "bg-transparent text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--sidebar-hover)] hover:border-[var(--border-hover)] focus-visible:ring-[var(--accent-ring)]",
  ghost:
    "bg-transparent text-[var(--foreground-muted)] border border-transparent hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)] focus-visible:ring-[var(--accent-ring)]",
  danger:
    "bg-[var(--expense-dim)] text-[var(--expense)] border border-[var(--expense)]/20 hover:bg-[var(--expense)]/20 focus-visible:ring-[var(--expense)]/30",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs min-h-[30px]",
  md: "px-4 py-2 text-sm min-h-[36px]",
  lg: "px-5 py-2.5 text-sm min-h-[42px]",
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
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
