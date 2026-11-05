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
        <Link href={`/stories/${story.slug}`} className="block" aria-hidden tabIndex={-1}>
          <Picture
            renditions={coverPhoto.renditions}
            width={coverPhoto.width}
            height={coverPhoto.height}
            alt=""
            blurDataUrl={coverPhoto.blurDataUrl}
            resolveUrl={resolveUrl}
            sizes="(min-width: 768px) 700px, 100vw"
          />
        </Link>
      )}
      <div className="p-5 sm:p-6">
        <h2 className="font-serif text-2xl leading-snug text-foreground">
          <Link
            href={`/stories/${story.slug}`}
            className="transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease)] hover:text-accent"
          >
            {story.title}
          </Link>
        </h2>
        <p className="mt-2 text-base leading-relaxed text-muted">{story.excerpt}</p>
        <div className="mt-4">
          <StoryMeta tags={story.tags} readingTimeMinutes={story.readingTimeMinutes} publishedAt={story.publishedAt} />
        </div>
      </div>
    </Card>
  );
}
