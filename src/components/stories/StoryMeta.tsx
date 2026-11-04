import { Tag } from "@/components/ui/Tag";
import { formatDate } from "@/lib/format";

interface StoryMetaProps {
  readonly tags: readonly string[];
  readonly readingTimeMinutes: number;
  readonly publishedAt: string | null;
}

/** The tags / reading time / published date row shared by story cards and the story detail page. */
export function StoryMeta({ tags, readingTimeMinutes, publishedAt }: StoryMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
      {publishedAt && <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>}
      <span aria-hidden="true">&middot;</span>
      <span>{readingTimeMinutes} min read</span>
      {tags.length > 0 && (
        <span className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </span>
      )}
    </div>
  );
}
