import { storyInputSchema } from "@/core/schemas/story";
import { computeReadingTimeMinutes } from "@/core/markdown/reading-time";
import { createItemHandlers } from "@/server/http/crud-routes";

const storyPatchSchema = storyInputSchema.partial();

export const { GET, PATCH, DELETE } = createItemHandlers({
  type: "story",
  patchSchema: storyPatchSchema,
  transformPatch: (patch) =>
    patch.bodyMarkdown !== undefined ? { readingTimeMinutes: computeReadingTimeMinutes(patch.bodyMarkdown) } : {},
});
