"use client";

import { Badge } from "@/components/ui/Badge";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
import { pickThumbnailUrl, type PhotoViewModel } from "./types";

interface PhotoGridProps {
  readonly photos: readonly PhotoViewModel[];
  readonly selectedId?: string | null;
  readonly onSelect?: (photo: PhotoViewModel) => void;
  readonly editable?: boolean;
  readonly onCaptionChange?: (photo: PhotoViewModel, changes: { altText?: string; caption?: string | null }) => void;
  readonly onDeleted?: (photoId: string) => void;
}

/** Shared thumbnail grid: plain viewer, cover-photo picker, or full manage mode depending on props. */
export function PhotoGrid({ photos, selectedId, onSelect, editable = false, onCaptionChange, onDeleted }: PhotoGridProps) {
  if (photos.length === 0) {
    return <p className="text-sm text-muted">No photos yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
      {photos.map((photo) => {
        const thumbnailUrl = pickThumbnailUrl(photo);
        const isSelected = selectedId === photo.id;

        return (
          <div
            key={photo.id}
            className={`flex flex-col gap-2 rounded-token border p-2 ${isSelected ? "border-accent ring-2 ring-accent" : "border-border"} bg-surface`}
          >
            <button
              type="button"
              onClick={() => onSelect?.(photo)}
              aria-pressed={onSelect ? isSelected : undefined}
              aria-label={onSelect ? `Select photo: ${photo.altText}` : undefined}
              className="relative flex aspect-square min-h-11 items-center justify-center overflow-hidden rounded-token bg-background"
            >
              {thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailUrl} alt={photo.altText} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted">{photo.status}</span>
              )}
            </button>

            <div className="flex flex-wrap items-center justify-between gap-1">
              <Badge tone={photo.status === "ready" ? "accent" : "neutral"}>{photo.status}</Badge>
              <Badge>{photo.kind}</Badge>
            </div>

            {editable ? (
              <>
                <input
                  defaultValue={photo.altText}
                  placeholder="Alt text"
                  aria-label={`Alt text for ${photo.altText || "photo"}`}
                  onBlur={(event) => onCaptionChange?.(photo, { altText: event.target.value })}
                  className="min-h-11 rounded-token border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <input
                  defaultValue={photo.caption ?? ""}
                  placeholder="Caption"
                  aria-label={`Caption for ${photo.altText || "photo"}`}
                  onBlur={(event) => onCaptionChange?.(photo, { caption: event.target.value || null })}
                  className="min-h-11 rounded-token border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <DeleteEntityButton
                  endpoint={`/api/admin/photos/${photo.id}`}
                  label="photo"
                  onDeleted={() => onDeleted?.(photo.id)}
                />
              </>
            ) : (
              <p className="truncate text-xs text-muted" title={photo.altText}>
                {photo.altText}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
