import { z } from "zod";
import { baseEntitySchema, isoDateTimeSchema, renditionSchema } from "./common";

export const photoKindSchema = z.enum(["gallery", "story", "asset"]);
export const photoStatusSchema = z.enum(["uploading", "processing", "ready", "failed"]);

export const photoSchema = baseEntitySchema.extend({
  kind: photoKindSchema,
  storyId: z.string().min(1).nullable(),
  altText: z.string().min(1).max(300),
  caption: z.string().max(500).nullable(),
  originalKey: z.string().min(1),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  bytes: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  renditions: z.array(renditionSchema),
  blurDataUrl: z.string().nullable(),
  status: photoStatusSchema,
  error: z.string().nullable(),
  takenAt: isoDateTimeSchema.nullable(),
  sortOrder: z.number().int(),
});

export type Photo = z.infer<typeof photoSchema>;
export type PhotoKind = z.infer<typeof photoKindSchema>;
export type PhotoStatus = z.infer<typeof photoStatusSchema>;

/** Fields the admin UI submits when editing caption/alt text/kind. */
export const photoUpdateSchema = photoSchema.pick({
  altText: true,
  caption: true,
  kind: true,
  storyId: true,
  sortOrder: true,
});

export type PhotoUpdate = z.infer<typeof photoUpdateSchema>;
