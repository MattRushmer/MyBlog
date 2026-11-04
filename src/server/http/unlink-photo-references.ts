import "server-only";
import type { ContentStore } from "@/adapters/content-store/types";

/**
 * Best-effort: a deleted photo should not leave dangling coverPhotoId /
 * screenshotPhotoId / badgePhotoId references pointing at nothing. Scans
 * every entity type that can reference a photo and nulls the field.
 */
export async function unlinkPhotoReferences(store: ContentStore, photoId: string): Promise<void> {
  const [stories, projects, certifications] = await Promise.all([
    store.list("story", { includeDrafts: true }),
    store.list("project", { includeDrafts: true }),
    store.list("certification", { includeDrafts: true }),
  ]);

  await Promise.all([
    ...stories
      .filter((story) => story.coverPhotoId === photoId)
      .map((story) => store.patch("story", story.id, { coverPhotoId: null })),
    ...projects
      .filter((project) => project.screenshotPhotoId === photoId)
      .map((project) => store.patch("project", project.id, { screenshotPhotoId: null })),
    ...certifications
      .filter((cert) => cert.badgePhotoId === photoId)
      .map((cert) => store.patch("certification", cert.id, { badgePhotoId: null })),
  ]);
}
