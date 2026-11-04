import Link from "next/link";
import type { Photo, Story } from "@/core/types";
import { Card } from "@/components/ui/Card";
import { Picture } from "@/components/ui/Picture";
import { StoryMeta } from "@/components/stories/StoryMeta";

interface StoryCardProps {
  readonly story: Story;
  readonly coverPhoto: Photo | null;
  readonly resolveUrl: (key: string) => string;
}

export function StoryCard({ story, coverPhoto, resolveUrl }: StoryCardProps) {
  return (
    <Card className="overflow-hidden p-0">
      {coverPhoto && (
        <Link href={`/stories/${story.slug}`} className="block">
          <Picture
            renditions={coverPhoto.renditions}
            width={coverPhoto.width}
            height={coverPhoto.height}
            alt={coverPhoto.altText}
            blurDataUrl={coverPhoto.blurDataUrl}
            resolveUrl={resolveUrl}
            sizes="(min-width: 768px) 700px, 100vw"
          />
        </Link>
      )}
      <div className="p-6">
        <h2 className="font-serif text-2xl text-foreground">
          <Link href={`/stories/${story.slug}`} className="hover:text-accent">
            {story.title}
          </Link>
        </h2>
        <p className="mt-2 text-muted">{story.excerpt}</p>
        <div className="mt-4">
          <StoryMeta tags={story.tags} readingTimeMinutes={story.readingTimeMinutes} publishedAt={story.publishedAt} />
        </div>
      </div>
    </Card>
  );
}
