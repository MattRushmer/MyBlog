import type { Rendition } from "@/core/types";

export interface ProcessResult {
  /** 'pending' = work dispatched asynchronously (AWS); poll the Photo record. */
  readonly status: "ready" | "pending" | "failed";
  readonly width: number;
  readonly height: number;
  readonly renditions: readonly Rendition[];
  readonly blurDataUrl: string | null;
  readonly error: string | null;
}

export interface ProcessInput {
  readonly photoId: string;
  readonly originalKey: string;
}

export interface ImageProcessor {
  process(input: ProcessInput): Promise<ProcessResult>;
}
