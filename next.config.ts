import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Security headers. The Apache vhost also sets the full set (CSP/HSTS are
  // proxy-only), but the app declares the simple headers itself so it stays
  // secure and verifiable when served directly (e.g. `next start`, e2e).
  // geolocation is (self) because the nearby discovery uses the browser's
  // location with an explicit opt-in.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(self), microphone=()" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Some crawlers and older browsers still request the legacy favicon path;
      // serve the existing brand icon instead of a 404.
      { source: "/favicon.ico", destination: "/icon.svg" },
    ];
  }
};

export default nextConfig;
