const COMBINING_MARKS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

/** Lowercase, hyphenated, ASCII-only slug suitable for a URL path segment. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(COMBINING_MARKS_PATTERN, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}
