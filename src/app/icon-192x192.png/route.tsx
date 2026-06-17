import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1120",
          padding: "24px",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="spendclan-pwa-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          
          {/* Wallet base */}
          <rect x="2" y="9" width="12" height="14" rx="2.5" stroke="url(#spendclan-pwa-grad)" strokeWidth="2.2" />
          
          {/* Wallet clasp */}
          <path d="M14 17h-2.5a1.5 1.5 0 0 1-1.5-1.5v-1a1.5 1.5 0 0 1 1.5-1.5h2.5" stroke="url(#spendclan-pwa-grad)" strokeWidth="2.2" strokeLinecap="round" />
          
          {/* Trendline inside wallet (Expense Tracking & Savings) */}
          <path d="M5 17l2.5-2.5 2 2 3-3" stroke="url(#spendclan-pwa-grad)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Splitting Paths (Bill Splits & shared expenses) */}
          <path d="M14 16h6" stroke="url(#spendclan-pwa-grad)" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M20 16l5-6" stroke="url(#spendclan-pwa-grad)" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M20 16l5 6" stroke="url(#spendclan-pwa-grad)" strokeWidth="2.2" strokeLinecap="round" />
          
          {/* Clan Nodes */}
          <circle cx="25" cy="10" r="2.5" fill="url(#spendclan-pwa-grad)" />
          <circle cx="26" cy="16" r="2.5" fill="url(#spendclan-pwa-grad)" />
          <circle cx="25" cy="22" r="2.5" fill="url(#spendclan-pwa-grad)" />
        </svg>
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  );
}
