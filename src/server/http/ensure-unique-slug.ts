import "server-only";
import { getContentStore } from "@/adapters";
import { ValidationError } from "@/core/errors";
import type { EntityType } from "@/core/types";

interface Slugged {
  readonly id: string;
  readonly slug: string;
}

/**
 * Story and Project are both looked up by slug (Story via a dedicated
 * getStoryBySlug, Project by scanning list() results on the public page),
 * but nothing previously stopped two items of the same type from sharing
 * a slug. Whichever adapter resolves "first" for that slug would win
 * silently, permanently orphaning the other - not a security issue, but a
 * real data-integrity bug. excludeId lets a PATCH keep its own slug.
 */
export async function ensureUniqueSlug(type: EntityType, slug: string, excludeId?: string): Promise<void> {
  const store = await getContentStore();
  const items = (await store.list(type, { includeDrafts: true })) as readonly Slugged[];
  const collision = items.find((item) => item.slug === slug && item.id !== excludeId);
  if (collision) {
    throw new ValidationError(`slug "${slug}" is already in use`);
  }
}
