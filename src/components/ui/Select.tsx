"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, options, placeholder, className = "", id, ...props },
    ref,
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-[var(--foreground-muted)]"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full min-h-[36px] rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? "border-[var(--expense)] focus:border-[var(--expense)] focus:ring-[var(--expense-dim)]"
              : "border-[var(--border)] focus:border-[var(--border-focus)] focus:ring-[var(--accent-ring)]"
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-[var(--card)] text-[var(--foreground-muted)]">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-[var(--card)] text-[var(--foreground)]">
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-[var(--expense)]">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";
