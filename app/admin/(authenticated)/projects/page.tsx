import { requireSession } from "@/server/auth/require-session";
import { getContentStore, getFileStorage } from "@/adapters";
import { loadConfig } from "@/config";
import { withResolvedUrls } from "@/server/http/resolve-photo-urls";
import { ProjectsManager } from "@/components/admin/projects/ProjectsManager";

export default async function ProjectsAdminPage() {
  await requireSession();
  const [store, fileStorage] = await Promise.all([getContentStore(), getFileStorage()]);
  const [projects, photos] = await Promise.all([
    store.list("project", { includeDrafts: true }),
    store.list("photo", { includeDrafts: true }),
  ]);
  const sortedProjects = [...projects].sort((a, b) => a.sortOrder - b.sortOrder);
  const resolvedPhotos = photos.map((photo) => withResolvedUrls(photo, fileStorage));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
      <ProjectsManager
        initialProjects={sortedProjects}
        initialPhotos={resolvedPhotos}
        maxUploadBytes={loadConfig().limits.maxUploadBytes}
      />
    </div>
  );
}
