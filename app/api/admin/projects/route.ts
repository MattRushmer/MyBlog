import { projectInputSchema, type Project } from "@/core/schemas/project";
import { createListCreateHandlers } from "@/server/http/crud-routes";
import { ensureUniqueSlug } from "@/server/http/ensure-unique-slug";

export const { GET, POST } = createListCreateHandlers({
  type: "project",
  inputSchema: projectInputSchema,
  validateInput: (input) => ensureUniqueSlug("project", input.slug),
  buildEntity: (input, id, now): Project => ({ ...input, id, createdAt: now, updatedAt: now }),
});
