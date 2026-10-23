import { useId, type ReactNode } from "react";

/**
 * Bento layout: one column on phones (most important tile first), 3 on tablets, 4 on desktop.
 * `grid-flow-dense` lets smaller tiles fill gaps left by larger ones.
 */
export function BentoGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 ${className}`}>
      {children}
    </div>
  );
}

// Literal class names so Tailwind can see them
const COL_SPAN = {
  1: "",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-3 lg:col-span-4",
} as const;
const LG_COL_SPAN = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
} as const;
const ROW_SPAN = {
  1: "",
  2: "md:row-span-2",
} as const;

interface BentoTileProps {
  /** Heading shown at the top of the tile; also its accessible name. */
  title?: string;
  /** Visually hide the heading but keep it for screen readers. */
  hideTitle?: boolean;
  /** Small action at the top right, e.g. "View all". */
  action?: ReactNode;
  /** Columns on tablets (3-col grid). */
  span?: keyof typeof COL_SPAN;
  /** Columns on desktop (4-col grid); defaults to `span`. */
  lgSpan?: keyof typeof LG_COL_SPAN;
  rows?: keyof typeof ROW_SPAN;
  /** Emphasised hero tile. */
  tone?: "default" | "hero";
  className?: string;
  children: ReactNode;
}

/** A minimal card in the bento grid. Solid surface, never glass. */
export function BentoTile({
  title,
  hideTitle = false,
  action,
  span = 1,
  lgSpan,
  rows = 1,
  tone = "default",
  className = "",
  children,
}: BentoTileProps) {
  const headingId = useId();
  const lg = LG_COL_SPAN[lgSpan ?? (Math.min(span, 4) as keyof typeof LG_COL_SPAN)];
  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`card relative flex min-w-0 flex-col overflow-hidden p-4 sm:p-6 ${COL_SPAN[span]} ${lg} ${ROW_SPAN[rows]} ${
        tone === "hero" ? "bg-[radial-gradient(120%_80%_at_0%_0%,var(--accent-dim),transparent_60%)]" : ""
      } ${className}`}
    >
      {(title || action) && (
        <div className={`mb-4 flex items-center justify-between gap-3 ${hideTitle && !action ? "sr-only" : ""}`}>
          {title && (
            <h2 id={headingId} className={`text-sm font-semibold text-[var(--foreground-muted)] ${hideTitle ? "sr-only" : ""}`}>
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
