import type { MetadataRoute } from "next";
import { loadConfig } from "@/config";
import { getContentStore } from "@/adapters";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { site } = loadConfig();
  const store = await getContentStore();
  const stories = await store.list("story");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/stories`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/photos`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site.url}/projects`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${site.url}/certifications`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${site.url}/links`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const storyRoutes: MetadataRoute.Sitemap = stories.map((story) => ({
    url: `${site.url}/stories/${story.slug}`,
    lastModified: story.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...storyRoutes];
}
