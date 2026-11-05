import { storyInputSchema, type Story } from "@/core/schemas/story";
import { computeReadingTimeMinutes } from "@/core/markdown/reading-time";
import { createListCreateHandlers } from "@/server/http/crud-routes";
import { ensureUniqueSlug } from "@/server/http/ensure-unique-slug";

export const { GET, POST } = createListCreateHandlers({
  type: "story",
  inputSchema: storyInputSchema,
  validateInput: (input) => ensureUniqueSlug("story", input.slug),
  buildEntity: (input, id, now): Story => ({
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
    readingTimeMinutes: computeReadingTimeMinutes(input.bodyMarkdown),
  }),
});
