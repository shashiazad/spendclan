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
            className="block text-[13px] font-normal uppercase tracking-wider text-[#8e8e93]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full min-h-[44px] rounded-xl border bg-white/50 dark:bg-zinc-900/50 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-200 ease-out focus:outline-none focus:ring-1 focus:ring-[#5e5ce6] focus:border-[#5e5ce6] disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? "border-[#ff453a] focus:border-[#ff453a] focus:ring-[#ff453a]"
              : "border-zinc-200 dark:border-zinc-800 focus:border-[#5e5ce6]"
          } ${className}`}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-slate-400">{hint}</p>
        )}
        {error && <p className="text-xs text-[#ff453a]">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
