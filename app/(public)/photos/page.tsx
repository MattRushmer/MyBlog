import type { Metadata } from "next";
import { getContentStore, getFileStorage } from "@/adapters";
import type { FileStorage } from "@/adapters/file-storage/types";
import type { Photo } from "@/core/types";
import { PhotoGallery, type GalleryPhoto } from "@/components/photos/PhotoGallery";

export const metadata: Metadata = {
  title: "Photos | Matt Rushmer",
  description: "A gallery of photos.",
};

function toGalleryPhoto(photo: Photo, fileStorage: FileStorage): GalleryPhoto {
  return {
    id: photo.id,
    alt: photo.altText,
    caption: photo.caption,
    width: photo.width,
    height: photo.height,
    blurDataUrl: photo.blurDataUrl,
    renditions: photo.renditions.map((rendition) => ({
      ...rendition,
      key: fileStorage.publicUrl(rendition.key),
    })),
  };
}

export default async function PhotosPage() {
  const store = await getContentStore();
  const fileStorage = await getFileStorage();

  // list("photo", { includeDrafts: true }) is required here, not a public-draft leak:
  // ListOptions' default draft filter checks `status === "published"`, but Photo.status
  // is a processing-pipeline state ("ready"/"uploading"/...) that never equals
  // "published" - without this flag list("photo") would always return an empty array.
  // Photos have no draft/publication concept of their own; visibility is governed by
  // `kind` and `status === "ready"`, both filtered explicitly below.
  const photos = await store.list("photo", { includeDrafts: true });
  const galleryPhotos = photos
    .filter((photo) => photo.kind === "gallery" && photo.status === "ready")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((photo) => toGalleryPhoto(photo, fileStorage));

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">Photos</h1>
      {galleryPhotos.length === 0 ? (
        <p className="mt-6 text-muted">No photos yet.</p>
      ) : (
        <div className="mt-8 sm:mt-10">
          <PhotoGallery photos={galleryPhotos} />
        </div>
      )}
    </main>
  );
}
