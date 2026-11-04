import { requireSession } from "@/server/auth/require-session";
import { getContentStore, getFileStorage } from "@/adapters";
import { loadConfig } from "@/config";
import { withResolvedUrls } from "@/server/http/resolve-photo-urls";
import { PhotoManager } from "@/components/admin/photos/PhotoManager";

export default async function PhotosAdminPage() {
  await requireSession();
  const [store, fileStorage] = await Promise.all([getContentStore(), getFileStorage()]);
  const photos = await store.list("photo", { includeDrafts: true });
  const resolved = photos
    .map((photo) => withResolvedUrls(photo, fileStorage))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Photos</h1>
      <PhotoManager initialPhotos={resolved} maxUploadBytes={loadConfig().limits.maxUploadBytes} />
    </div>
  );
}
