import { requireSession } from "@/server/auth/require-session";
import { getContentStore, getFileStorage } from "@/adapters";
import { loadConfig } from "@/config";
import { withResolvedUrls } from "@/server/http/resolve-photo-urls";
import { StoryForm } from "@/components/admin/stories/StoryForm";

export default async function NewStoryPage() {
  await requireSession();
  const [store, fileStorage] = await Promise.all([getContentStore(), getFileStorage()]);
  const photos = await store.list("photo", { includeDrafts: true });
  const resolvedPhotos = photos.map((photo) => withResolvedUrls(photo, fileStorage));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">New story</h1>
      <StoryForm mode="create" initialPhotos={resolvedPhotos} maxUploadBytes={loadConfig().limits.maxUploadBytes} />
    </div>
  );
}
