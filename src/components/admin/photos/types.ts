import type { Photo } from "@/core/types";

/** Mirrors src/server/http/resolve-photo-urls.ts's PhotoWithUrls - what every admin photo API returns. */
export interface PhotoViewModel extends Omit<Photo, "renditions"> {
  readonly originalUrl: string;
  readonly renditions: ReadonlyArray<Photo["renditions"][number] & { readonly url: string }>;
}

/** Smallest webp rendition for a grid thumbnail, falling back to jpeg, then the original. */
export function pickThumbnailUrl(photo: PhotoViewModel): string | null {
  const webp = [...photo.renditions].filter((r) => r.format === "webp").sort((a, b) => a.width - b.width)[0];
  if (webp) return webp.url;
  const jpeg = photo.renditions.find((r) => r.format === "jpeg");
  if (jpeg) return jpeg.url;
  return photo.status === "ready" ? photo.originalUrl : null;
}
