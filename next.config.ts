import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Security headers (X-Content-Type-Options / Referrer-Policy /
  // Permissions-Policy / CSP / HSTS / X-Frame-Options) are emitted once by the
  // Apache vhost, so they are intentionally not duplicated here.
  async rewrites() {
    return [
      // Some crawlers and older browsers still request the legacy favicon path;
      // serve the existing brand icon instead of a 404.
      { source: "/favicon.ico", destination: "/icon.svg" },
    ];
  }
};

export default nextConfig;
