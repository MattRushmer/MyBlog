import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/require-session";
import { getContentStore, getFileStorage } from "@/adapters";
import { loadConfig } from "@/config";
import { withResolvedUrls } from "@/server/http/resolve-photo-urls";
import { StoryForm } from "@/components/admin/stories/StoryForm";

interface EditStoryPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function EditStoryPage({ params }: EditStoryPageProps) {
  await requireSession();
  const { id } = await params;

  const [store, fileStorage] = await Promise.all([getContentStore(), getFileStorage()]);
  const [story, photos] = await Promise.all([store.get("story", id), store.list("photo", { includeDrafts: true })]);

  if (!story) notFound();

  const resolvedPhotos = photos.map((photo) => withResolvedUrls(photo, fileStorage));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Edit story</h1>
      <StoryForm mode="edit" initialStory={story} initialPhotos={resolvedPhotos} maxUploadBytes={loadConfig().limits.maxUploadBytes} />
    </div>
  );
}
