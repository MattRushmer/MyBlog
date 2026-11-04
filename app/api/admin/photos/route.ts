import { getContentStore, getFileStorage } from "@/adapters";
import { requireSession } from "@/server/auth/require-session";
import { dataResponse, handleRouteError } from "@/server/http/envelope";
import { withResolvedUrls } from "@/server/http/resolve-photo-urls";

/**
 * Photos have no admin-facing POST: they're only ever created through the
 * upload-ticket flow (app/api/admin/uploads), never a full-entity payload -
 * there is no photoInputSchema to validate against because of that.
 */
export async function GET() {
  try {
    await requireSession();
    const [store, fileStorage] = await Promise.all([getContentStore(), getFileStorage()]);
    const photos = await store.list("photo", { includeDrafts: true });
    return dataResponse(photos.map((photo) => withResolvedUrls(photo, fileStorage)));
  } catch (error) {
    return handleRouteError(error);
  }
}
