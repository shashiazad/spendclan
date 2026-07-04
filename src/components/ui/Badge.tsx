import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[var(--sidebar-hover)] text-[var(--foreground-muted)] border-[var(--border)]",
  success: "bg-[var(--income-dim)] text-[var(--income)] border-[var(--income)]/20",
  warning: "bg-[var(--warning-dim)] text-[var(--warning)] border-[var(--warning)]/20",
  danger:  "bg-[var(--expense-dim)] text-[var(--expense)] border-[var(--expense)]/20",
  info:    "bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]/20",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
