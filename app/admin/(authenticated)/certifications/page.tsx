import { requireSession } from "@/server/auth/require-session";
import { getContentStore, getFileStorage } from "@/adapters";
import { loadConfig } from "@/config";
import { withResolvedUrls } from "@/server/http/resolve-photo-urls";
import { CertificationsManager } from "@/components/admin/certifications/CertificationsManager";

export default async function CertificationsAdminPage() {
  await requireSession();
  const [store, fileStorage] = await Promise.all([getContentStore(), getFileStorage()]);
  const [certifications, photos] = await Promise.all([
    store.list("certification", { includeDrafts: true }),
    store.list("photo", { includeDrafts: true }),
  ]);
  const sorted = [...certifications].sort((a, b) => a.sortOrder - b.sortOrder);
  const resolvedPhotos = photos.map((photo) => withResolvedUrls(photo, fileStorage));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Certifications</h1>
      <CertificationsManager
        initialCertifications={sorted}
        initialPhotos={resolvedPhotos}
        maxUploadBytes={loadConfig().limits.maxUploadBytes}
      />
    </div>
  );
}
