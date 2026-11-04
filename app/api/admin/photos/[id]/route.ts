import { NextRequest } from "next/server";
import { photoUpdateSchema } from "@/core/schemas/photo";
import { NotFoundError } from "@/core/errors";
import { getContentStore, getFileStorage } from "@/adapters";
import { requireSession } from "@/server/auth/require-session";
import { dataResponse, handleRouteError } from "@/server/http/envelope";
import { withResolvedUrls } from "@/server/http/resolve-photo-urls";
import { unlinkPhotoReferences } from "@/server/http/unlink-photo-references";

const photoPatchSchema = photoUpdateSchema.partial();

interface RouteContext {
  readonly params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireSession();
    const { id } = await context.params;
    const [store, fileStorage] = await Promise.all([getContentStore(), getFileStorage()]);
    const photo = await store.get("photo", id);
    if (!photo) throw new NotFoundError("photo", id);
    return dataResponse(withResolvedUrls(photo, fileStorage));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireSession();
    const { id } = await context.params;
    const changes = photoPatchSchema.parse(await request.json());
    const [store, fileStorage] = await Promise.all([getContentStore(), getFileStorage()]);
    const updated = await store.patch("photo", id, changes);
    return dataResponse(withResolvedUrls(updated, fileStorage));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requireSession();
    const { id } = await context.params;
    const store = await getContentStore();
    const photo = await store.get("photo", id);
    if (!photo) throw new NotFoundError("photo", id);

    const fileStorage = await getFileStorage();
    await fileStorage.delete([photo.originalKey, ...photo.renditions.map((rendition) => rendition.key)]);
    await unlinkPhotoReferences(store, id);
    await store.delete("photo", id);

    return dataResponse({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
