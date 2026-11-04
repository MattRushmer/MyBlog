"use client";

import { useEffect, useRef } from "react";
import type { Rendition } from "@/core/types";

export interface LightboxPhoto {
  readonly id: string;
  readonly alt: string;
  readonly caption: string | null;
  readonly width: number;
  readonly height: number;
  readonly renditions: readonly Rendition[];
}

interface LightboxProps {
  readonly photos: readonly LightboxPhoto[];
  readonly index: number;
  readonly onClose: () => void;
  readonly onNavigate: (nextIndex: number) => void;
}

function srcSet(renditions: readonly Rendition[]): string {
  return renditions
    .filter((rendition) => rendition.format === "webp")
    .map((rendition) => `${rendition.key} ${rendition.width}w`)
    .join(", ");
}

/** A keyboard-operable, click-outside-to-close image viewer for the photo gallery. */
export function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const photo = photos[index];

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        onNavigate((index + 1) % photos.length);
        return;
      }
      if (event.key === "ArrowLeft") {
        onNavigate((index - 1 + photos.length) % photos.length);
        return;
      }
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, photos.length, onClose, onNavigate]);

  if (!photo) return null;
  const jpegFallback = photo.renditions.find((rendition) => rendition.format === "jpeg") ?? photo.renditions[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={photo.alt}
        className="relative flex max-h-full max-w-5xl flex-col items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-10 right-0 rounded-token px-3 py-1 text-sm text-background underline-offset-4 transition-opacity duration-150 hover:underline hover:opacity-80 sm:top-0 sm:-right-12"
        >
          Close
        </button>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onNavigate((index - 1 + photos.length) % photos.length)}
              aria-label="Previous photo"
              className="absolute left-0 top-1/2 -translate-y-1/2 rounded-token px-3 py-2 text-background transition-opacity duration-150 hover:opacity-80"
            >
              &larr;
            </button>
            <button
              type="button"
              onClick={() => onNavigate((index + 1) % photos.length)}
              aria-label="Next photo"
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-token px-3 py-2 text-background transition-opacity duration-150 hover:opacity-80"
            >
              &rarr;
            </button>
          </>
        )}

        <picture>
          <source type="image/webp" srcSet={srcSet(photo.renditions)} />
          <img
            src={jpegFallback?.key}
            width={photo.width}
            height={photo.height}
            alt={photo.alt}
            className="max-h-[80vh] w-auto rounded-token"
          />
        </picture>
        {photo.caption && <p className="mt-3 text-center text-sm text-background">{photo.caption}</p>}
      </div>
    </div>
  );
}
