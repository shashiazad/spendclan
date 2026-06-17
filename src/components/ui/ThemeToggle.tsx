"use client";

import React, { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Determine active theme on client initialization asynchronously to avoid cascading renders
    const isLight = document.documentElement.classList.contains("light");
    const timeout = setTimeout(() => {
      setTheme(isLight ? "light" : "dark");
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="rounded-full p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/40 transition-all duration-300 hover:scale-105 flex items-center justify-center shrink-0 border border-transparent hover:border-slate-800/40"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        // Moon Icon (Click for Dark)
        <svg
          className="h-5 w-5 transition-transform duration-500 hover:rotate-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        // Sun Icon (Click for Light)
        <svg
          className="h-5 w-5 transition-transform duration-500 hover:rotate-45"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 5.657a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
    </button>
  );
}
