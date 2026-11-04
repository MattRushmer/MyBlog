const PHOTO_REFERENCE_PATTERN = /^photo:(.+)$/;

/** Inline photos use `![alt](photo:<id>)` instead of a real URL, resolved against the story's own photos. */
export function parsePhotoReference(src: string): string | null {
  const match = src.match(PHOTO_REFERENCE_PATTERN);
  return match ? match[1] : null;
}
