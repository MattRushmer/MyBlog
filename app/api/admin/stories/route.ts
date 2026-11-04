import { storyInputSchema, type Story } from "@/core/schemas/story";
import { computeReadingTimeMinutes } from "@/core/markdown/reading-time";
import { createListCreateHandlers } from "@/server/http/crud-routes";

export const { GET, POST } = createListCreateHandlers({
  type: "story",
  inputSchema: storyInputSchema,
  buildEntity: (input, id, now): Story => ({
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
    readingTimeMinutes: computeReadingTimeMinutes(input.bodyMarkdown),
  }),
});
