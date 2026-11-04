import { generateImageRenditions } from "@/core/images/process";
import type { FileStorage } from "@/adapters/file-storage/types";
import type { ImageProcessor, ProcessInput, ProcessResult } from "../types";

export class LocalImageProcessor implements ImageProcessor {
  constructor(private readonly fileStorage: FileStorage) {}

  async process(input: ProcessInput): Promise<ProcessResult> {
    const original = await this.fileStorage.get(input.originalKey);
    if (!original) {
      return {
        status: "failed",
        width: 0,
        height: 0,
        renditions: [],
        blurDataUrl: null,
        error: `Original not found: ${input.originalKey}`,
      };
    }

    try {
      const generated = await generateImageRenditions(Buffer.from(original.body), input.photoId);
      await Promise.all(
        generated.renditions.map((rendition) => {
          const contentType = rendition.format === "jpeg" ? "image/jpeg" : `image/${rendition.format}`;
          return this.fileStorage.put(rendition.key, rendition.buffer, contentType);
        }),
      );
      return {
        status: "ready",
        width: generated.width,
        height: generated.height,
        renditions: generated.renditions.map(({ buffer: _buffer, ...rendition }) => rendition),
        blurDataUrl: generated.blurDataUrl,
        error: null,
      };
    } catch (error) {
      return {
        status: "failed",
        width: 0,
        height: 0,
        renditions: [],
        blurDataUrl: null,
        error: error instanceof Error ? error.message : "Unknown image processing error",
      };
    }
  }
}
