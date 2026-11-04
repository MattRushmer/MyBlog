import { NextRequest } from "next/server";
import { z } from "zod";
import { photoKindSchema, type Photo } from "@/core/schemas/photo";
import { loadConfig } from "@/config";
import { createId } from "@/core/ids";
import { originalKey } from "@/core/images/renditions";
import { getContentStore, getFileStorage } from "@/adapters";
import { requireSession } from "@/server/auth/require-session";
import { dataResponse, errorResponse, handleRouteError } from "@/server/http/envelope";
import { deriveAltTextFromFilename, extensionFromFilename, sanitizeFilename } from "@/server/uploads/filename";

const createUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^image\//, "contentType must be an image/* type"),
  bytes: z.number().int().positive(),
  kind: photoKindSchema,
  storyId: z.string().min(1).nullable().optional(),
});

/**
 * Step 1 of the two-step upload: records a placeholder Photo (status
 * 'uploading', dimensions unknown yet) and hands back a ticket the browser
 * uploads the raw bytes to directly - app/api/admin/uploads/blob in local
 * mode, a presigned S3 PUT in AWS mode.
 */
export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const config = loadConfig();
    const body = createUploadSchema.parse(await request.json());

    if (body.bytes > config.limits.maxUploadBytes) {
      return errorResponse(
        "payload_too_large",
        `File exceeds the maximum allowed size of ${config.limits.maxUploadBytes} bytes`,
        413,
      );
    }

    const photoId = createId();
    const extension = extensionFromFilename(body.filename, body.contentType);
    const key = originalKey(photoId, extension);
    const now = new Date().toISOString();

    const photo: Photo = {
      id: photoId,
      createdAt: now,
      updatedAt: now,
      kind: body.kind,
      storyId: body.storyId ?? null,
      altText: deriveAltTextFromFilename(body.filename),
      caption: null,
      originalKey: key,
      originalFilename: sanitizeFilename(body.filename),
      mimeType: body.contentType,
      bytes: body.bytes,
      width: 0,
      height: 0,
      renditions: [],
      blurDataUrl: null,
      status: "uploading",
      error: null,
      takenAt: null,
      sortOrder: 0,
    };

    const [store, fileStorage] = await Promise.all([getContentStore(), getFileStorage()]);
    await store.put("photo", photo);
    const ticket = await fileStorage.createUploadTicket({
      key,
      contentType: body.contentType,
      maxBytes: config.limits.maxUploadBytes,
    });

    return dataResponse({ photoId, ticket }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
