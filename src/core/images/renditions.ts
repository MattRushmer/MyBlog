/**
 * The rendition ladder. Imported by both the local image processor and the
 * AWS Lambda (infra/lambda/image-resize) so output is byte-for-byte
 * comparable between modes. Do not fork this file per mode.
 *
 * AVIF is deliberately deferred (slow to encode, not worth it until the
 * WebP pipeline is proven) - v1 ships WebP at every tier plus one JPEG
 * fallback for universal compatibility.
 */

export const RENDITION_WIDTHS = [320, 640, 1024, 1600, 2400] as const;
export const JPEG_FALLBACK_WIDTH = 1024;
export const BLUR_PLACEHOLDER_WIDTH = 16;

/** Widths to actually generate for a given original width: never upscale. */
export function targetWidths(originalWidth: number): number[] {
  const fitting = RENDITION_WIDTHS.filter((width) => width <= originalWidth);
  return fitting.length > 0 ? fitting : [originalWidth];
}

/** The single width used for the universal JPEG fallback. */
export function jpegFallbackWidth(originalWidth: number): number {
  const widths = targetWidths(originalWidth);
  const atOrBelowTarget = widths.filter((width) => width <= JPEG_FALLBACK_WIDTH);
  return atOrBelowTarget.length > 0 ? Math.max(...atOrBelowTarget) : Math.min(...widths);
}

export function originalKey(photoId: string, extension: string): string {
  return `originals/${photoId}.${extension}`;
}

export function renditionKey(photoId: string, width: number, format: "webp" | "jpeg" | "avif"): string {
  const extension = format === "jpeg" ? "jpg" : format;
  return `photos/${photoId}/${width}.${extension}`;
}
