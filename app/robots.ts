import type { MetadataRoute } from "next";
import { loadConfig } from "@/config";

export default function robots(): MetadataRoute.Robots {
  const { site } = loadConfig();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/admin"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
