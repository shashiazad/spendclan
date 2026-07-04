import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--sidebar-hover)] text-[var(--foreground-muted)] border border-[var(--border)]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-[var(--foreground-muted)]">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
