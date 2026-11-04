import type { Rendition } from "@/core/types";

interface PictureProps {
  readonly renditions: readonly Rendition[];
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly blurDataUrl?: string | null;
  readonly sizes?: string;
  readonly className?: string;
  readonly priority?: boolean;
  readonly resolveUrl: (key: string) => string;
}

function srcSet(renditions: readonly Rendition[], resolveUrl: (key: string) => string): string {
  return renditions.map((rendition) => `${resolveUrl(rendition.key)} ${rendition.width}w`).join(", ");
}

/**
 * Renders our own pre-generated rendition ladder as a responsive
 * <picture> - webp sources plus one jpeg fallback for universal
 * compatibility. Next's built-in image optimizer is disabled
 * (next.config.ts) specifically so this is the only image path.
 */
export function Picture({
  renditions,
  width,
  height,
  alt,
  blurDataUrl,
  sizes = "100vw",
  className,
  priority = false,
  resolveUrl,
}: PictureProps) {
  const webpRenditions = renditions.filter((rendition) => rendition.format === "webp");
  const jpegRendition = renditions.find((rendition) => rendition.format === "jpeg");
  const fallback = jpegRendition ?? renditions[0];

  if (!fallback) return null;

  return (
    <picture
      className={className}
      style={
        blurDataUrl
          ? {
              backgroundImage: `url(${blurDataUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {webpRenditions.length > 0 && (
        <source type="image/webp" srcSet={srcSet(webpRenditions, resolveUrl)} sizes={sizes} />
      )}
      <img
        src={resolveUrl(fallback.key)}
        width={width}
        height={height}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="h-auto w-full"
      />
    </picture>
  );
}
