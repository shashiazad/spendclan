import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F19" },
  ],
  colorScheme: "dark light",
};

export const metadata: Metadata = {
  title: "SpendClan — Split Group Expenses & Settle Up",
  description: "Split group expenses with flatmates, trips and friends, and settle up effortlessly with SpendClan.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo-64.png", sizes: "64x64", type: "image/png" },
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpendClan",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The inline script below sets the theme class before React hydrates, so the class may differ
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var saved = null;
                try { saved = localStorage.getItem('theme'); } catch (e) {}
                var light = saved ? saved === 'light' : window.matchMedia('(prefers-color-scheme: light)').matches;
                document.documentElement.classList.toggle('light', light);
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
