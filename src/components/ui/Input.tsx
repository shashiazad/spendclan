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
            className="block text-[10px] font-semibold uppercase tracking-widest text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full min-h-[40px] rounded-xl border bg-[#F5F5F7] dark:bg-[#1C1C1E] px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? "border-danger focus:border-danger focus:ring-danger/25"
              : "border-transparent focus:border-accent focus:ring-accent/20"
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
