import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getContentStore, getFileStorage } from "@/adapters";
import { StoryMarkdown, type StoryPhotoViewModel } from "@/components/markdown/StoryMarkdown";
import { Picture } from "@/components/ui/Picture";
import { StoryMeta } from "@/components/stories/StoryMeta";

interface StoryPageParams {
  readonly slug: string;
}

const loadStory = cache(async (slug: string) => {
  const store = await getContentStore();
  return store.getStoryBySlug(slug);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<StoryPageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await loadStory(slug);
  if (!story) return {};
  return {
    title: `${story.title} | Matt Rushmer`,
    description: story.excerpt,
  };
}

export default async function StoryDetailPage({ params }: { params: Promise<StoryPageParams> }) {
  const { slug } = await params;
  const story = await loadStory(slug);
  if (!story) notFound();

  const store = await getContentStore();
  const fileStorage = await getFileStorage();
  const storyPhotos = await store.listPhotosByStory(story.id);

  const photoMap: Record<string, StoryPhotoViewModel> = {};
  for (const photo of storyPhotos) {
    photoMap[photo.id] = {
      width: photo.width,
      height: photo.height,
      altText: photo.altText,
      caption: photo.caption,
      renditions: photo.renditions,
      blurDataUrl: photo.blurDataUrl,
    };
  }

  const coverPhoto = story.coverPhotoId
    ? storyPhotos.find((photo) => photo.id === story.coverPhotoId) ?? (await store.get("photo", story.coverPhotoId))
    : null;

  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
      <article>
        <header>
          <h1 className="font-serif text-4xl text-foreground">{story.title}</h1>
          <div className="mt-4">
            <StoryMeta
              tags={story.tags}
              readingTimeMinutes={story.readingTimeMinutes}
              publishedAt={story.publishedAt}
            />
          </div>
        </header>

        {coverPhoto && (
          <Picture
            className="mt-8"
            renditions={coverPhoto.renditions}
            width={coverPhoto.width}
            height={coverPhoto.height}
            alt={coverPhoto.altText}
            blurDataUrl={coverPhoto.blurDataUrl}
            resolveUrl={fileStorage.publicUrl}
            sizes="(min-width: 768px) 768px, 100vw"
            priority
          />
        )}

        <StoryMarkdown
          className="story-body mt-10 font-serif"
          markdown={story.bodyMarkdown}
          photos={photoMap}
          resolveUrl={fileStorage.publicUrl}
        />
      </article>
    </main>
  );
}
