import { projectInputSchema, type Project } from "@/core/schemas/project";
import { createListCreateHandlers } from "@/server/http/crud-routes";

export const { GET, POST } = createListCreateHandlers({
  type: "project",
  inputSchema: projectInputSchema,
  buildEntity: (input, id, now): Project => ({ ...input, id, createdAt: now, updatedAt: now }),
});
