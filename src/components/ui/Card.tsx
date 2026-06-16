import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
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
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className = "",
  padding = "md",
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/50 shadow-lg shadow-black/20 backdrop-blur-sm ${paddingClasses[padding]} ${className}`}
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
    <div
      className={`mb-4 flex items-start justify-between gap-4 ${className}`}
    >
      <div>
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = "" }: CardBodyProps) {
  return <div className={className}>{children}</div>;
}
