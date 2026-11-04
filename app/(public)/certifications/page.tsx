import type { Metadata } from "next";
import { getContentStore, getFileStorage } from "@/adapters";
import { CertificationCard } from "@/components/certifications/CertificationCard";
import { loadPhotosByIds } from "@/lib/photo-lookup";

export const metadata: Metadata = {
  title: "Certifications | Matt Rushmer",
  description: "Certifications earned and in progress.",
};

export default async function CertificationsPage() {
  const store = await getContentStore();
  const fileStorage = await getFileStorage();

  const certifications = await store.list("certification");
  const sorted = [...certifications].sort((a, b) => a.sortOrder - b.sortOrder);
  const photoById = await loadPhotosByIds(store, sorted.map((certification) => certification.badgePhotoId));

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-serif text-4xl text-foreground">Certifications</h1>
      {sorted.length === 0 ? (
        <p className="mt-6 text-muted">No certifications listed yet.</p>
      ) : (
        <div className="mt-10 grid gap-6">
          {sorted.map((certification) => (
            <CertificationCard
              key={certification.id}
              certification={certification}
              badgePhoto={certification.badgePhotoId ? photoById.get(certification.badgePhotoId) ?? null : null}
              resolveUrl={fileStorage.publicUrl}
            />
          ))}
        </div>
      )}
    </main>
  );
}
