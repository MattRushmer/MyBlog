"use client";

import { useState } from "react";
import type { Rendition } from "@/core/types";
import { Picture } from "@/components/ui/Picture";
import { Lightbox } from "@/components/photos/Lightbox";

export interface GalleryPhoto {
  readonly id: string;
  readonly alt: string;
  readonly caption: string | null;
  readonly width: number;
  readonly height: number;
  readonly blurDataUrl: string | null;
  /** Renditions whose `key` is already a resolved public URL, not a raw storage key. */
  readonly renditions: readonly Rendition[];
}

const RESOLVED_URL = (url: string) => url;

/** The public photo gallery grid plus its lightbox. Client-side because opening the lightbox is local UI state. */
export function PhotoGallery({ photos }: { readonly photos: readonly GalleryPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="overflow-hidden rounded-token transition-opacity duration-150 hover:opacity-90"
            aria-label={`Open photo: ${photo.alt}`}
          >
            <Picture
              renditions={photo.renditions}
              width={photo.width}
              height={photo.height}
              alt={photo.alt}
              blurDataUrl={photo.blurDataUrl}
              resolveUrl={RESOLVED_URL}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="h-full object-cover"
            />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <Lightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </>
  );
}
