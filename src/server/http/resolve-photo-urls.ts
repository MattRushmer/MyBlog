import "server-only";
import type { Photo } from "@/core/types";
import type { FileStorage } from "@/adapters/file-storage/types";

export interface PhotoWithUrls extends Omit<Photo, "renditions"> {
  readonly originalUrl: string;
  readonly renditions: ReadonlyArray<Photo["renditions"][number] & { readonly url: string }>;
}

/**
 * Admin UI needs an actual <img src> for each rendition. Resolving that is
 * FileStorage.publicUrl's job (it differs by deploy mode) - this just maps
 * it over a Photo so the client never has to know '/api/files' vs CloudFront.
 */
export function withResolvedUrls(photo: Photo, fileStorage: FileStorage): PhotoWithUrls {
  return {
    ...photo,
    originalUrl: fileStorage.publicUrl(photo.originalKey),
    renditions: photo.renditions.map((rendition) => ({
      ...rendition,
      url: fileStorage.publicUrl(rendition.key),
    })),
  };
}
