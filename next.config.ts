import type { NextConfig } from "next";
import { LEGACY_SLUGS } from "./src/data/actuators";

/**
 * Baseline security headers. No full Content-Security-Policy yet: the theme
 * script and the 3D runtime need a nonce-based policy to be done properly.
 * frame-ancestors still blocks other sites from embedding ActuatorLab.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // Product-code URLs from the first release now point at technology pages.
    return Object.entries(LEGACY_SLUGS).map(([code, id]) => ({
      source: `/explorer/${code}`,
      destination: `/explorer/${id}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
