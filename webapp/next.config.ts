import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Cache control for data files
        source: '/data/:path*.json',
        headers: [
          {
            key: 'Cache-Control',
            // public: can be cached by CDN and browser
            // max-age=60: browser caches for 60 seconds
            // s-maxage=60: CDN caches for 60 seconds
            // stale-while-revalidate=30: serve stale while fetching fresh
            value: 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
