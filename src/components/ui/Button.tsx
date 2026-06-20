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
    "bg-accent text-white hover:bg-accent-hover focus-visible:ring-accent/50 disabled:bg-accent/50 shadow-sm border border-transparent",
  secondary:
    "bg-card/50 text-foreground border border-card-border hover:bg-sidebar-hover focus-visible:ring-muted/30 shadow-sm",
  ghost:
    "bg-transparent text-muted hover:bg-sidebar-hover hover:text-foreground focus-visible:ring-muted/30",
  danger:
    "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 focus-visible:ring-danger/50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-xs min-h-[32px]",
  md: "px-6 py-2 text-sm min-h-[40px]",
  lg: "px-8 py-2.5 text-base min-h-[44px]",
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
        className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 ease-[var(--ease-apple)] hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
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
