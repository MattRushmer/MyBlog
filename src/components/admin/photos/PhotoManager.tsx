"use client";

import { useMemo, useState } from "react";
import type { PhotoKind } from "@/core/schemas/photo";
import { PhotoUploadZone } from "./PhotoUploadZone";
import { PhotoGrid } from "./PhotoGrid";
import type { PhotoViewModel } from "./types";

interface PhotoManagerProps {
  readonly initialPhotos: readonly PhotoViewModel[];
  readonly maxUploadBytes: number;
}

const KIND_FILTERS: ReadonlyArray<{ value: PhotoKind | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "gallery", label: "Gallery" },
  { value: "story", label: "Story" },
  { value: "asset", label: "Asset" },
];

/** Full admin Photos page: upload zone + filterable grid with caption editing and delete. */
export function PhotoManager({ initialPhotos, maxUploadBytes }: PhotoManagerProps) {
  const [photos, setPhotos] = useState<readonly PhotoViewModel[]>(initialPhotos);
  const [kindFilter, setKindFilter] = useState<PhotoKind | "all">("all");
  const [uploadKind, setUploadKind] = useState<PhotoKind>("gallery");

  const visiblePhotos = useMemo(
    () => (kindFilter === "all" ? photos : photos.filter((photo) => photo.kind === kindFilter)),
    [photos, kindFilter],
  );

  function handleUploaded(photo: PhotoViewModel) {
    setPhotos((current) => [photo, ...current.filter((item) => item.id !== photo.id)]);
  }

  function handleDeleted(photoId: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }

  async function handleCaptionChange(photo: PhotoViewModel, changes: { altText?: string; caption?: string | null }) {
    const response = await fetch(`/api/admin/photos/${photo.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(changes),
    });
    if (!response.ok) return;
    const { data } = await response.json();
    setPhotos((current) => current.map((item) => (item.id === photo.id ? (data as PhotoViewModel) : item)));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-foreground" htmlFor="upload-kind">
          Upload as
        </label>
        <select
          id="upload-kind"
          value={uploadKind}
          onChange={(event) => setUploadKind(event.target.value as PhotoKind)}
          className="min-h-11 rounded-token border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="gallery">Gallery</option>
          <option value="story">Story</option>
          <option value="asset">Asset</option>
        </select>
      </div>

      <PhotoUploadZone kind={uploadKind} maxUploadBytes={maxUploadBytes} onUploaded={handleUploaded} />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter photos by kind">
        {KIND_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setKindFilter(filter.value)}
            aria-pressed={kindFilter === filter.value}
            className={`inline-flex min-h-11 items-center rounded-token px-3 text-sm transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease)] ${
              kindFilter === filter.value ? "bg-accent text-accent-foreground" : "border border-border text-foreground"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <PhotoGrid photos={visiblePhotos} editable onCaptionChange={handleCaptionChange} onDeleted={handleDeleted} />
    </div>
  );
}
