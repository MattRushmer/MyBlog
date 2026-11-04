import { generateImageRenditions } from "@/core/images/process";
import { originalKey } from "@/core/images/renditions";
import { createId } from "@/core/ids";
import type { Photo, PhotoKind } from "@/core/types";
import type { LocalFileStorage } from "@/adapters/file-storage/local";
import { createPlaceholderImage } from "./placeholder-image";

export interface CreateSeedPhotoInput {
  readonly label: string;
  readonly kind: PhotoKind;
  readonly storyId: string | null;
  readonly altText: string;
  readonly caption: string | null;
  readonly sortOrder: number;
  readonly paletteIndex: number;
  readonly width?: number;
  readonly height?: number;
}

/** Generates a placeholder image, runs it through the real rendition pipeline, and stores everything. */
export async function createSeedPhoto(storage: LocalFileStorage, input: CreateSeedPhotoInput): Promise<Photo> {
  const width = input.width ?? 1600;
  const height = input.height ?? 1000;
  const photoId = createId();
  const now = new Date().toISOString();

  const original = await createPlaceholderImage(input.label, width, height, input.paletteIndex);
  const key = originalKey(photoId, "jpg");
  await storage.put(key, original, "image/jpeg");

  const generated = await generateImageRenditions(original, photoId);
  await Promise.all(
    generated.renditions.map((rendition) => {
      const contentType = rendition.format === "jpeg" ? "image/jpeg" : `image/${rendition.format}`;
      return storage.put(rendition.key, rendition.buffer, contentType);
    }),
  );

  return {
    id: photoId,
    kind: input.kind,
    storyId: input.storyId,
    altText: input.altText,
    caption: input.caption,
    originalKey: key,
    originalFilename: `${input.label.toLowerCase().replace(/\s+/g, "-")}.jpg`,
    mimeType: "image/jpeg",
    bytes: original.byteLength,
    width: generated.width,
    height: generated.height,
    renditions: generated.renditions.map(({ buffer: _buffer, ...rendition }) => rendition),
    blurDataUrl: generated.blurDataUrl,
    status: "ready",
    error: null,
    takenAt: now,
    sortOrder: input.sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}
