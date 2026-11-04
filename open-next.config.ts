import type { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

/**
 * next.config.ts sets images.unoptimized=true (we serve our own pre-
 * generated renditions instead of Next's image API), so the
 * image-optimization-function is dead weight. Skipping its sharp install
 * also sidesteps a Windows-only open-next bug where the install step's
 * mkdtemp path concatenates a second absolute path into the temp dir
 * template and fails with ENOENT. CDK never provisions a CloudFront
 * behavior for it (see infra/lib/stacks/site-stack.ts).
 */
const config = {
  default: {},
  imageOptimization: {
    loader: "s3-lite",
    install: {
      packages: [],
    },
  },
} satisfies OpenNextConfig;

export default config;
