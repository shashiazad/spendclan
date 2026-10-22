import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SpendClan is group-only now: old personal-finance pages land on the groups Home
  // so bookmarks and installed-app shortcuts keep working.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/groups", permanent: true },
      { source: "/personal", destination: "/groups", permanent: true },
      { source: "/personal/:path*", destination: "/groups", permanent: true },
    ];
  },
};

export default nextConfig;
