"use client";

import React from "react";

function BrandIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      {/* Wallet base */}
      <rect x="2" y="9" width="12" height="14" rx="2.5" stroke="currentColor" strokeWidth={2} />
      {/* Wallet clasp */}
      <path d="M14 17h-2.5a1.5 1.5 0 01-1.5-1.5v-1a1.5 1.5 0 011.5-1.5h2.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      {/* Trendline inside wallet (Expense Tracking & Savings) */}
      <path d="M5 17l2.5-2.5 2 2 3-3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Splitting Paths (Bill Splits & shared expenses) */}
      <path d="M14 16h6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M20 16l5-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M20 16l5 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      {/* Clan Nodes */}
      <circle cx="25" cy="10" r="2.5" fill="currentColor" />
      <circle cx="26" cy="16" r="2.5" fill="currentColor" />
      <circle cx="25" cy="22" r="2.5" fill="currentColor" />
    </svg>
  );
}

interface SocialLink {
  name: string;
  url: string;
  icon: React.ReactNode;
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks: SocialLink[] = [
    {
      name: "Portfolio",
      url: "https://shashisa.vercel.app/",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      url: "https://linkedin.com/in/shashisa",
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c-2.761 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
    {
      name: "GitHub",
      url: "https://github.com/shashiazad",
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
      ),
    },
    {
      name: "Medium",
      url: "https://shashisa.medium.com",
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42zM24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
        </svg>
      ),
    },
    {
      name: "Instagram",
      url: "https://instagram.com/shashii_s_a",
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="border-t border-slate-800/40 bg-slate-950 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          
          {/* Left Column / Brand Attribution */}
          <div className="flex flex-col space-y-4 max-w-md">
            <div className="flex items-center gap-2.5">
              <BrandIcon className="h-6 w-6 text-emerald-400" />
              <span className="text-lg font-bold tracking-tight text-slate-200">
                SpendClan
              </span>
            </div>
            
            <p className="text-sm text-slate-400 leading-relaxed">
              Track personal expenses, build sustainable savings habits, and settle group bills effortlessly with bank-grade isolated records.
            </p>
            
            <div className="flex flex-col space-y-1 pt-2">
              <span className="text-xs text-slate-500 font-medium">
                Crafted with precision by{" "}
                <span className="text-slate-300 hover:text-emerald-400 transition-colors duration-200 cursor-default">
                  Shashi Shekhar Azad
                </span>
              </span>
              <span className="text-xs text-slate-500">
                &copy; {currentYear} SpendClan. All rights reserved.
              </span>
            </div>
          </div>

          {/* Right Column / Professional Links Array */}
          <div className="flex flex-col space-y-4 md:items-end">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Developer Connections
            </span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-6">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors duration-200"
                >
                  <span className="text-slate-500 hover:text-emerald-400 transition-colors duration-200 shrink-0">
                    {link.icon}
                  </span>
                  <span>{link.name}</span>
                </a>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </footer>
  );
}
