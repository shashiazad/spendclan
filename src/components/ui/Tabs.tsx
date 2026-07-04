"use client";

import { useState, type ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  children: (activeTab: string) => ReactNode;
  className?: string;
}

export function Tabs({ tabs, defaultTab, children, className = "" }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? "");

  return (
    <div className={className}>
      <div className="relative mb-5 flex gap-1 rounded-lg bg-[var(--surface)] p-1 border border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`relative flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
              active === tab.id
                ? "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-[var(--shadow-sm)]"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-transparent"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="animate-fade-in" key={active}>
        {children(active)}
      </div>
    </div>
  );
}
