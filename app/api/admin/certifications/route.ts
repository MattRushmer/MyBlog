import { certificationInputSchema, type Certification } from "@/core/schemas/certification";
import { createListCreateHandlers } from "@/server/http/crud-routes";

export const { GET, POST } = createListCreateHandlers({
  type: "certification",
  inputSchema: certificationInputSchema,
  buildEntity: (input, id, now): Certification => ({ ...input, id, createdAt: now, updatedAt: now }),
});
