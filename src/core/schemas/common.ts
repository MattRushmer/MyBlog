import { z } from "zod";

export const isoDateTimeSchema = z.string().datetime();

export const baseEntitySchema = z.object({
  id: z.string().min(1),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const renditionFormatSchema = z.enum(["avif", "webp", "jpeg"]);

export const renditionSchema = z.object({
  key: z.string().min(1),
  format: renditionFormatSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive(),
});

export type RenditionFormat = z.infer<typeof renditionFormatSchema>;
export type Rendition = z.infer<typeof renditionSchema>;
