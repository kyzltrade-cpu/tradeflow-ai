import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      // Quotes list and Suppliers are retired from the product — the Queue
      // (/admin) is the single home. Quote detail (/admin/quotes/[id]) stays.
      { source: '/admin/quotes', destination: '/admin', permanent: true },
      { source: '/admin/suppliers', destination: '/admin', permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  sourcemaps: {
    disable: true,
  },
});
