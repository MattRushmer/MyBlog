import { projectInputSchema } from "@/core/schemas/project";
import { createItemHandlers } from "@/server/http/crud-routes";

export const { GET, PATCH, DELETE } = createItemHandlers({
  type: "project",
  patchSchema: projectInputSchema.partial(),
});
