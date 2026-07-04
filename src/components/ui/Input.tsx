"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[var(--foreground-muted)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full min-h-[36px] rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] transition-colors duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? "border-[var(--expense)] focus:border-[var(--expense)] focus:ring-[var(--expense-dim)]"
              : "border-[var(--border)] focus:border-[var(--border-focus)] focus:ring-[var(--accent-ring)]"
          } ${className}`}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-[var(--foreground-subtle)]">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-[var(--expense)]">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
