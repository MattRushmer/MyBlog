export type SniffedImageType = "image/jpeg" | "image/png" | "image/webp";

function matchesAt(bytes: Uint8Array, offset: number, signature: readonly number[]): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * Checks magic bytes against known image signatures - never trust a
 * client-supplied Content-Type header for something as security-sensitive
 * as "what kind of file is this". Returns null for anything unrecognized.
 */
export function sniffImageType(bytes: Uint8Array): SniffedImageType | null {
  if (matchesAt(bytes, 0, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (matchesAt(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (matchesAt(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && matchesAt(bytes, 8, [0x57, 0x45, 0x42, 0x50])) {
    return "image/webp";
  }
  return null;
}
