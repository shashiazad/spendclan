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
      <div className="relative mb-6 flex gap-1 rounded-xl bg-slate-900/50 p-1 border border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              active === tab.id
                ? "bg-slate-800 text-white shadow-lg shadow-black/20"
                : "text-slate-400 hover:text-slate-200"
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
