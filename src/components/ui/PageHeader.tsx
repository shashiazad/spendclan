import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  /** Small line above the title, e.g. "Across all your groups". */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Buttons at the top right (wrap below the title on phones). */
  actions?: ReactNode;
}

/** The one page heading used across the app: an h1 with optional eyebrow, description and actions. */
export function PageHeader({ title, eyebrow, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm text-[var(--foreground-muted)]">{eyebrow}</p>}
        <h1 className="mt-0.5 break-words text-3xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[var(--foreground-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
