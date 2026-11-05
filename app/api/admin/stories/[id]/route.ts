import { storyInputSchema } from "@/core/schemas/story";
import { computeReadingTimeMinutes } from "@/core/markdown/reading-time";
import { createItemHandlers } from "@/server/http/crud-routes";
import { ensureUniqueSlug } from "@/server/http/ensure-unique-slug";

const storyPatchSchema = storyInputSchema.partial();

export const { GET, PATCH, DELETE } = createItemHandlers({
  type: "story",
  patchSchema: storyPatchSchema,
  validatePatch: (patch, id) =>
    patch.slug !== undefined ? ensureUniqueSlug("story", patch.slug, id) : undefined,
  transformPatch: (patch) =>
    patch.bodyMarkdown !== undefined ? { readingTimeMinutes: computeReadingTimeMinutes(patch.bodyMarkdown) } : {},
});
