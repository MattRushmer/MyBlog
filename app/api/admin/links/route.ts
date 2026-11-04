import { linkInputSchema, type Link } from "@/core/schemas/link";
import { isValidIconKey } from "@/core/icons/registry";
import { ValidationError } from "@/core/errors";
import { createListCreateHandlers } from "@/server/http/crud-routes";

function assertValidIconKey(iconKey: string): void {
  if (!isValidIconKey(iconKey)) {
    throw new ValidationError(`Unknown iconKey: ${iconKey}`);
  }
}

export const { GET, POST } = createListCreateHandlers({
  type: "link",
  inputSchema: linkInputSchema,
  validateInput: (input) => assertValidIconKey(input.iconKey),
  buildEntity: (input, id, now): Link => ({ ...input, id, createdAt: now, updatedAt: now }),
});
