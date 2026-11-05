import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * script-src stays strict in production (no inline/eval needed - Next.js
 * ships all its own JS as external same-origin bundles). 'unsafe-eval' is
 * only added outside production because Next's dev-mode Fast Refresh
 * overlay relies on it; it never ships to a built app. style-src needs
 * 'unsafe-inline' because Picture.tsx sets a blur-placeholder background
 * via an inline style attribute, not a stylesheet class.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Harmless locally (browsers only honor it over https); becomes
  // effective the moment a real domain goes live. No preload directive -
  // that's a one-way commitment and there's no custom domain yet.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // The photo adapter already generates a fixed rendition ladder on upload
  // (src/core/images/renditions.ts), so Next's own image optimizer would
  // just be a second, redundant compute path. Picture.tsx serves our
  // pre-generated renditions directly via srcset instead.
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
