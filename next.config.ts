import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The photo adapter already generates a fixed rendition ladder on upload
  // (src/core/images/renditions.ts), so Next's own image optimizer would
  // just be a second, redundant compute path. Picture.tsx serves our
  // pre-generated renditions directly via srcset instead.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
