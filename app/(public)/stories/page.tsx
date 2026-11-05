import type { Metadata } from "next";
import { getContentStore, getFileStorage } from "@/adapters";
import type { Story } from "@/core/types";
import { StoryCard } from "@/components/stories/StoryCard";
import { loadPhotosByIds } from "@/lib/photo-lookup";

export const metadata: Metadata = {
  title: "Stories | Matt Rushmer",
  description: "Stories on security, cloud infrastructure, and the occasional home-lab experiment.",
};

function sortByPublishedDesc(stories: readonly Story[]): Story[] {
  return [...stories].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export default async function StoriesPage() {
  const store = await getContentStore();
  const fileStorage = await getFileStorage();

  const stories = await store.list("story");
  const sortedStories = sortByPublishedDesc(stories);
  const photoById = await loadPhotosByIds(store, sortedStories.map((story) => story.coverPhotoId));

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">Stories</h1>
      {sortedStories.length === 0 ? (
        <p className="mt-6 text-muted">No stories published yet.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:mt-10 sm:gap-8">
          {sortedStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              coverPhoto={story.coverPhotoId ? photoById.get(story.coverPhotoId) ?? null : null}
              resolveUrl={fileStorage.publicUrl}
            />
          ))}
        </div>
      )}
    </main>
  );
}
