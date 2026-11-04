import { loadConfig } from "@/config";
import { getContentStore } from "@/adapters";
import { escapeXml } from "@/lib/format";
import type { Story } from "@/core/types";

function sortByPublishedDesc(stories: readonly Story[]): Story[] {
  return [...stories].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

function renderItem(story: Story, siteUrl: string): string {
  const link = `${siteUrl}/stories/${story.slug}`;
  const pubDate = story.publishedAt ? new Date(story.publishedAt).toUTCString() : undefined;
  return `
    <item>
      <title>${escapeXml(story.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(story.excerpt)}</description>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
    </item>`;
}

export async function GET() {
  const { site } = loadConfig();
  const store = await getContentStore();
  const stories = sortByPublishedDesc(await store.list("story"));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${escapeXml(site.url)}</link>
    <description>${escapeXml(site.description)}</description>
    ${stories.map((story) => renderItem(story, site.url)).join("")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
