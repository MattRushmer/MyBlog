import type { ContentStore } from "@/adapters/content-store/types";
import type { Photo } from "@/core/types";

/**
 * Fetches specific photos by id via ContentStore.get rather than list("photo").
 * list() hides anything whose `status` isn't "published" by default, but
 * Photo.status is a processing-pipeline state ("ready"/"uploading"/...), not
 * a publication state - no photo ever has status "published", so list()
 * would silently return nothing. get() reads the entity directly and isn't
 * subject to that filter, which is what a cover/screenshot/badge lookup by a
 * known id actually wants.
 */
export async function loadPhotosByIds(
  store: ContentStore,
  ids: readonly (string | null)[],
): Promise<ReadonlyMap<string, Photo>> {
  const uniqueIds = [...new Set(ids.filter((id): id is string => id !== null))];
  const photos = await Promise.all(uniqueIds.map((id) => store.get("photo", id)));
  return new Map(
    uniqueIds
      .map((id, index) => [id, photos[index]] as const)
      .filter((entry): entry is [string, Photo] => entry[1] !== null),
  );
}
