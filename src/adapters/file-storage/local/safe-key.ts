import path from "node:path";
import { ValidationError } from "@/core/errors";

/**
 * Resolves a storage key to an absolute path inside uploadsDir, rejecting
 * anything that could escape it (path traversal via "..", absolute paths,
 * null bytes, backslashes smuggled in from a different OS).
 */
export function resolveSafeKey(uploadsDir: string, key: string): string {
  if (!key || key.includes("\0")) {
    throw new ValidationError(`Invalid storage key: ${JSON.stringify(key)}`);
  }
  const normalized = key.replace(/\\/g, "/");
  const segments = normalized.split("/").filter((segment) => segment.length > 0);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new ValidationError(`Storage key must not contain "." or ".." segments: ${key}`);
  }

  const root = path.resolve(uploadsDir);
  const resolved = path.resolve(root, ...segments);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new ValidationError(`Storage key escapes uploads directory: ${key}`);
  }
  return resolved;
}
