interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizeClasses = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
};

export function LoadingSpinner({
  size = "md",
  label = "Loading...",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-label={label}
    >
      <div
        className={`animate-spin rounded-full border-emerald-500 border-t-transparent ${sizeClasses[size]}`}
      />
      {label && (
        <p className="text-sm text-slate-400">{label}</p>
      )}
    </div>
  );
}
