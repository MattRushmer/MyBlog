import { z } from "zod";
import { baseEntitySchema, isoDateTimeSchema } from "./common";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const storySchema = baseEntitySchema.extend({
  slug: z.string().min(1).max(96).regex(slugPattern, "slug must be lowercase, hyphenated, alphanumeric"),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500),
  bodyMarkdown: z.string(),
  coverPhotoId: z.string().min(1).nullable(),
  tags: z.array(z.string().min(1).max(40)).max(20),
  status: z.enum(["draft", "published"]),
  publishedAt: isoDateTimeSchema.nullable(),
  readingTimeMinutes: z.number().int().nonnegative(),
  isFeatured: z.boolean(),
});

export type Story = z.infer<typeof storySchema>;

/** Fields the admin UI submits; server fills id/timestamps/readingTime. */
export const storyInputSchema = storySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  readingTimeMinutes: true,
});

export type StoryInput = z.infer<typeof storyInputSchema>;
