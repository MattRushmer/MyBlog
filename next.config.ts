import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * script-src needs 'unsafe-inline': the App Router hydrates by streaming
 * RSC payloads through inline `<script>self.__next_f.push(...)</script>`
 * tags in the initial HTML, not just external bundles - verified directly
 * (a prior stricter CSP here silently broke hydration on every page,
 * leaving the DOM blank despite a 200 response). Next's documented fix is
 * a per-request nonce generated in middleware, but that requires every
 * page using it to opt out of static generation (nonces must be unique
 * per request), which would undermine this project's static-generation /
 * cost-minimization architecture (most public pages are prerendered at
 * build time). 'unsafe-inline' is the deliberate tradeoff for a site with
 * no user-generated script content and already-sanitized Markdown;
 * frame-ancestors/object-src/base-uri still block the higher-value attack
 * classes (clickjacking, plugin injection, base-tag hijacking). 'unsafe-
 * eval' is added only outside production, for Next's dev-mode Fast
 * Refresh overlay. style-src needs 'unsafe-inline' because Picture.tsx
 * sets a blur-placeholder background via an inline style attribute.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
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
