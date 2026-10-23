"use client";

import { useState, type ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps {
  items: Tab[];
  value: string;
  onChange: (id: string) => void;
  /** Accessible name for the group of buttons. */
  label: string;
  className?: string;
}

/**
 * A glass segmented control. Each segment is a button with aria-pressed, so it works with
 * keyboard and screen readers without the full tabs pattern.
 */
export function SegmentedControl({ items, value, onChange, label, className = "" }: SegmentedControlProps) {
  return (
    <div role="group" aria-label={label} className={`glass inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1 ${className}`}>
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(t.id)}
            className={`flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${
              active
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--accent)]/40"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  children: (activeTab: string) => ReactNode;
  className?: string;
  label?: string;
}

export function Tabs({ tabs, defaultTab, children, className = "", label = "Sections" }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? "");

  return (
    <div className={className}>
      <SegmentedControl items={tabs} value={active} onChange={setActive} label={label} className="mb-5" />
      <div className="animate-fade-in" key={active}>
        {children(active)}
      </div>
    </div>
  );
}
