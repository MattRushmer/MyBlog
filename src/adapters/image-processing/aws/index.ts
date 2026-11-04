import type { ImageProcessor, ProcessInput, ProcessResult } from "../types";

/**
 * In AWS mode the actual resizing happens in a separate Lambda triggered by
 * the S3 "originals/" prefix (infra/lambda/image-resize, sharing
 * src/core/images/process.ts with the local implementation). This adapter
 * exists only so the app's upload flow has a symmetric call site - it
 * reports 'pending' immediately and the admin UI polls the Photo record
 * until the Lambda patches it to 'ready' or 'failed'.
 */
export class LambdaImageProcessor implements ImageProcessor {
  async process(_input: ProcessInput): Promise<ProcessResult> {
    return {
      status: "pending",
      width: 0,
      height: 0,
      renditions: [],
      blurDataUrl: null,
      error: null,
    };
  }
}
