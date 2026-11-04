import { NextRequest } from "next/server";
import type { Photo } from "@/core/types";
import { NotFoundError } from "@/core/errors";
import { getContentStore, getFileStorage, getImageProcessor } from "@/adapters";
import { requireSession } from "@/server/auth/require-session";
import { dataResponse, errorResponse, handleRouteError } from "@/server/http/envelope";
import { withResolvedUrls } from "@/server/http/resolve-photo-urls";

interface RouteContext {
  readonly params: Promise<{ photoId: string }>;
}

/**
 * Step 2 of the two-step upload: confirms the original actually landed in
 * storage, then runs it through the image processor. Local mode resolves
 * synchronously ('ready'); AWS mode dispatches to Lambda and comes back
 * 'pending', so the Photo sits at 'processing' until S3 notifies.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    await requireSession();
    const { photoId } = await context.params;

    const store = await getContentStore();
    const photo = await store.get("photo", photoId);
    if (!photo) throw new NotFoundError("photo", photoId);

    const fileStorage = await getFileStorage();
    const head = await fileStorage.head(photo.originalKey);
    if (!head) {
      return errorResponse("upload_not_found", "Original upload was not found - it may not have completed", 400);
    }

    const imageProcessor = await getImageProcessor();
    const result = await imageProcessor.process({ photoId, originalKey: photo.originalKey });

    let updated: Photo;
    if (result.status === "ready") {
      updated = await store.patch("photo", photoId, {
        width: result.width,
        height: result.height,
        renditions: [...result.renditions],
        blurDataUrl: result.blurDataUrl,
        status: "ready",
        bytes: head.bytes,
        error: null,
      });
    } else if (result.status === "pending") {
      updated = await store.patch("photo", photoId, { status: "processing" });
    } else {
      updated = await store.patch("photo", photoId, { status: "failed", error: result.error });
    }

    return dataResponse(withResolvedUrls(updated, fileStorage));
  } catch (error) {
    return handleRouteError(error);
  }
}
