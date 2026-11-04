"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PhotoKind } from "@/core/schemas/photo";
import { PhotoGrid } from "./PhotoGrid";
import { PhotoUploadZone } from "./PhotoUploadZone";
import type { PhotoViewModel } from "./types";

interface CoverPhotoPickerProps {
  readonly initialPhotos: readonly PhotoViewModel[];
  readonly selectedId: string | null;
  readonly onChange: (photoId: string | null) => void;
  readonly maxUploadBytes: number;
  readonly storyId?: string | null;
  /** Kind recorded for a photo uploaded from this picker - 'story' for story covers, 'asset' for project/cert art. */
  readonly uploadKind?: PhotoKind;
}

/** Pick an existing ready photo as a single-value field, or upload a new one inline. */
export function CoverPhotoPicker({
  initialPhotos,
  selectedId,
  onChange,
  maxUploadBytes,
  storyId,
  uploadKind = "story",
}: CoverPhotoPickerProps) {
  const [photos, setPhotos] = useState<readonly PhotoViewModel[]>(initialPhotos.filter((photo) => photo.status === "ready"));
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const selectedPhoto = photos.find((photo) => photo.id === selectedId) ?? null;

  function handleUploaded(photo: PhotoViewModel) {
    setPhotos((current) => [photo, ...current.filter((item) => item.id !== photo.id)]);
    onChange(photo.id);
    setIsPickerOpen(false);
  }

  if (!isPickerOpen) {
    return (
      <div className="flex items-center gap-3">
        {selectedPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selectedPhoto.originalUrl} alt={selectedPhoto.altText} className="h-16 w-16 rounded-token object-cover" />
        ) : (
          <p className="text-sm text-muted">No cover photo selected.</p>
        )}
        <Button type="button" variant="secondary" onClick={() => setIsPickerOpen(true)}>
          {selectedPhoto ? "Change" : "Choose photo"}
        </Button>
        {selectedPhoto && (
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-token border border-border bg-surface p-4">
      <PhotoUploadZone kind={uploadKind} storyId={storyId} maxUploadBytes={maxUploadBytes} onUploaded={handleUploaded} />
      <PhotoGrid
        photos={photos}
        selectedId={selectedId}
        onSelect={(photo) => {
          onChange(photo.id);
          setIsPickerOpen(false);
        }}
      />
      <Button type="button" variant="ghost" onClick={() => setIsPickerOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}
