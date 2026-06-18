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
            className="block text-[13px] font-normal uppercase tracking-wider text-[#8e8e93]"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full min-h-[44px] rounded-xl border bg-white/50 dark:bg-zinc-900/50 px-4 py-3 text-sm text-slate-100 transition-all duration-200 ease-out focus:outline-none focus:ring-1 focus:ring-[#5e5ce6] focus:border-[#5e5ce6] disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? "border-[#ff453a] focus:border-[#ff453a] focus:ring-[#ff453a]"
              : "border-zinc-200 dark:border-zinc-800 focus:border-[#5e5ce6]"
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";
