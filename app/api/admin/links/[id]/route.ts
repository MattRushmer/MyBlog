import { linkInputSchema } from "@/core/schemas/link";
import { isValidIconKey } from "@/core/icons/registry";
import { ValidationError } from "@/core/errors";
import { createItemHandlers } from "@/server/http/crud-routes";

export const { GET, PATCH, DELETE } = createItemHandlers({
  type: "link",
  patchSchema: linkInputSchema.partial(),
  validatePatch: (patch) => {
    if (patch.iconKey !== undefined && !isValidIconKey(patch.iconKey)) {
      throw new ValidationError(`Unknown iconKey: ${patch.iconKey}`);
    }
  },
});
