import { z } from "zod";
import { baseEntitySchema } from "./common";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const projectSchema = baseEntitySchema.extend({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(96).regex(slugPattern, "slug must be lowercase, hyphenated, alphanumeric"),
  description: z.string().min(1).max(2000),
  techTags: z.array(z.string().min(1).max(40)).max(20),
  repoUrl: z.string().url().nullable(),
  liveUrl: z.string().url().nullable(),
  screenshotPhotoId: z.string().min(1).nullable(),
  isFeatured: z.boolean(),
  status: z.enum(["draft", "published"]),
  sortOrder: z.number().int(),
});

export type Project = z.infer<typeof projectSchema>;

export const projectInputSchema = projectSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type ProjectInput = z.infer<typeof projectInputSchema>;
