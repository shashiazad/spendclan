import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  /** Lifts slightly on hover and presses in on tap (for cards that are links or buttons). */
  interactive?: boolean;
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-4 sm:p-5",
  lg: "p-4 sm:p-6",
};

export function Card({
  children,
  className = "",
  padding = "md",
  interactive = false,
}: CardProps) {
  return (
    <div
      className={`card ${interactive ? "tile-interactive" : ""} ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className = "",
}: CardHeaderProps) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-4 ${className}`}>
      <div>
        <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-sm text-[var(--foreground-muted)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = "" }: CardBodyProps) {
  return <div className={className}>{children}</div>;
}
