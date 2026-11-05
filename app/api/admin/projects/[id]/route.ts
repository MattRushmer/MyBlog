import { projectInputSchema } from "@/core/schemas/project";
import { createItemHandlers } from "@/server/http/crud-routes";
import { ensureUniqueSlug } from "@/server/http/ensure-unique-slug";

export const { GET, PATCH, DELETE } = createItemHandlers({
  type: "project",
  patchSchema: projectInputSchema.partial(),
  validatePatch: (patch, id) =>
    patch.slug !== undefined ? ensureUniqueSlug("project", patch.slug, id) : undefined,
});
