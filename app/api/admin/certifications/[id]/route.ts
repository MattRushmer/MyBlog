import { certificationInputSchema } from "@/core/schemas/certification";
import { createItemHandlers } from "@/server/http/crud-routes";

export const { GET, PATCH, DELETE } = createItemHandlers({
  type: "certification",
  patchSchema: certificationInputSchema.partial(),
});
