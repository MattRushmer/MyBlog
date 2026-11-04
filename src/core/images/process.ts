import sharp, { type Sharp } from "sharp";
import type { Rendition, RenditionFormat } from "@/core/schemas/common";
import { BLUR_PLACEHOLDER_WIDTH, jpegFallbackWidth, renditionKey, targetWidths } from "./renditions";

export interface GeneratedRendition extends Rendition {
  readonly buffer: Buffer;
}

export interface GeneratedImage {
  readonly width: number;
  readonly height: number;
  readonly renditions: readonly GeneratedRendition[];
  readonly blurDataUrl: string;
}

async function encode(image: Sharp, width: number, format: RenditionFormat): Promise<Buffer> {
  const resized = image.clone().resize({ width, withoutEnlargement: true });
  if (format === "webp") return resized.webp({ quality: 80 }).toBuffer();
  if (format === "jpeg") return resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return resized.avif({ quality: 60 }).toBuffer();
}

/**
 * Pure function: takes original image bytes, returns every rendition's
 * bytes plus a tiny inline blur placeholder. Shared verbatim by the local
 * adapter (src/adapters/image-processing/local) and the AWS Lambda
 * (infra/lambda/image-resize) so both modes produce identical output.
 */
export async function generateImageRenditions(originalBuffer: Buffer, photoId: string): Promise<GeneratedImage> {
  const image = sharp(originalBuffer, { failOn: "error" });
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width === 0 || height === 0) {
    throw new Error("Unable to read image dimensions");
  }

  const widths = targetWidths(width);
  const fallbackWidth = jpegFallbackWidth(width);

  const webpRenditions = await Promise.all(
    widths.map(async (targetWidth) => {
      const buffer = await encode(image, targetWidth, "webp");
      const scaledHeight = Math.round((height / width) * targetWidth);
      return {
        key: renditionKey(photoId, targetWidth, "webp"),
        format: "webp" as const,
        width: targetWidth,
        height: scaledHeight,
        bytes: buffer.byteLength,
        buffer,
      };
    }),
  );

  const jpegBuffer = await encode(image, fallbackWidth, "jpeg");
  const jpegScaledHeight = Math.round((height / width) * fallbackWidth);
  const jpegRendition: GeneratedRendition = {
    key: renditionKey(photoId, fallbackWidth, "jpeg"),
    format: "jpeg",
    width: fallbackWidth,
    height: jpegScaledHeight,
    bytes: jpegBuffer.byteLength,
    buffer: jpegBuffer,
  };

  const blurBuffer = await image
    .clone()
    .resize({ width: BLUR_PLACEHOLDER_WIDTH, withoutEnlargement: true })
    .webp({ quality: 40 })
    .toBuffer();
  const blurDataUrl = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

  return {
    width,
    height,
    renditions: [...webpRenditions, jpegRendition],
    blurDataUrl,
  };
}
