const EXTENSION_BY_CONTENT_TYPE: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Strips any path, keeps a conservative charset, caps length - never trust a client filename as-is. */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const cleaned = base.replace(/[^\w.\- ]+/g, "_").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 255) : "upload";
}

/** Prefers the filename's own extension (sanitized), falls back to the declared content type. */
export function extensionFromFilename(filename: string, contentType: string): string {
  const match = filename.match(/\.([A-Za-z0-9]{1,5})$/);
  const fromFilename = match?.[1]?.toLowerCase() ?? null;
  if (fromFilename && /^[a-z0-9]+$/.test(fromFilename)) return fromFilename;
  return EXTENSION_BY_CONTENT_TYPE[contentType] ?? "bin";
}

/** Photo.altText requires a non-empty string; this gives every upload a reasonable default to edit later. */
export function deriveAltTextFromFilename(filename: string): string {
  const base = filename
    .replace(/\.[^./\\]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return base.length > 0 ? base.slice(0, 300) : "Uploaded photo";
}
