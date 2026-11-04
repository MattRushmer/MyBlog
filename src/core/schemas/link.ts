import { z } from "zod";
import { baseEntitySchema } from "./common";

/**
 * Shape-only check. Membership in the actual curated icon registry
 * (src/core/icons/registry.ts) is checked by the use-case layer so this
 * schema module never has to import the registry.
 */
const iconKeyPattern = /^(brand|generic):[a-z0-9-]+$/;

export const linkSchema = baseEntitySchema.extend({
  label: z.string().min(1).max(100),
  url: z.string().url(),
  iconKey: z.string().regex(iconKeyPattern, "iconKey must look like 'brand:github' or 'generic:mail'"),
  description: z.string().max(300).nullable(),
  isVisible: z.boolean(),
  sortOrder: z.number().int(),
});

export type Link = z.infer<typeof linkSchema>;

export const linkInputSchema = linkSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type LinkInput = z.infer<typeof linkInputSchema>;
