import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { parsePhotoReference } from "@/core/markdown/photo-reference";
import { Picture } from "@/components/ui/Picture";
import type { Rendition } from "@/core/types";

export interface StoryPhotoViewModel {
  readonly width: number;
  readonly height: number;
  readonly altText: string;
  readonly caption: string | null;
  readonly renditions: readonly Rendition[];
  readonly blurDataUrl: string | null;
}

interface StoryMarkdownProps {
  readonly markdown: string;
  readonly photos: Readonly<Record<string, StoryPhotoViewModel>>;
  readonly resolveUrl: (key: string) => string;
  readonly className?: string;
}

/**
 * Renders story Markdown with GFM + sanitization, and resolves inline
 * `![alt](photo:<id>)` references against the story's own photos into a
 * responsive <Picture>. A plain external image URL still renders as a
 * normal <img> - only our own photo: scheme gets the responsive
 * treatment.
 */
export function StoryMarkdown({ markdown, photos, resolveUrl, className }: StoryMarkdownProps) {
  const components: Components = {
    img({ src, alt }) {
      const photoId = typeof src === "string" ? parsePhotoReference(src) : null;
      const photo = photoId ? photos[photoId] : undefined;

      if (!photo) {
        // Non-photo: sources (a plain external URL) skip our rendition pipeline on purpose -
        // next/image is disabled project-wide (next.config.ts), so there's nothing to switch to.
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />;
      }

      return (
        <figure>
          <Picture
            renditions={photo.renditions}
            width={photo.width}
            height={photo.height}
            alt={alt || photo.altText}
            blurDataUrl={photo.blurDataUrl}
            resolveUrl={resolveUrl}
          />
          {photo.caption && <figcaption>{photo.caption}</figcaption>}
        </figure>
      );
    },
    a({ href, children }) {
      const isExternal = typeof href === "string" && /^https?:\/\//.test(href);
      return (
        <a href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}>
          {children}
        </a>
      );
    },
  };

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
