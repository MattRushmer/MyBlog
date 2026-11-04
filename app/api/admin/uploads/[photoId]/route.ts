import { NextRequest } from "next/server";
import { NotFoundError } from "@/core/errors";
import { getContentStore, getFileStorage } from "@/adapters";
import { requireSession } from "@/server/auth/require-session";
import { dataResponse, handleRouteError } from "@/server/http/envelope";
import { withResolvedUrls } from "@/server/http/resolve-photo-urls";

interface RouteContext {
  readonly params: Promise<{ photoId: string }>;
}

/** Lets the admin UI poll upload/processing status - required for AWS mode's async pipeline. */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireSession();
    const { photoId } = await context.params;
    const [store, fileStorage] = await Promise.all([getContentStore(), getFileStorage()]);
    const photo = await store.get("photo", photoId);
    if (!photo) throw new NotFoundError("photo", photoId);
    return dataResponse(withResolvedUrls(photo, fileStorage));
  } catch (error) {
    return handleRouteError(error);
  }
}
