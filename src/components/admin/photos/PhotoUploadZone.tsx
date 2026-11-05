"use client";

import { useState, type DragEvent } from "react";
import type { PhotoKind } from "@/core/schemas/photo";
import type { PhotoViewModel } from "./types";

interface UploadingFile {
  readonly key: string;
  readonly name: string;
  status: "uploading" | "processing" | "done" | "failed";
  message?: string;
}

interface PhotoUploadZoneProps {
  readonly kind: PhotoKind;
  readonly storyId?: string | null;
  readonly maxUploadBytes: number;
  readonly onUploaded: (photo: PhotoViewModel) => void;
}

const POLL_INTERVAL_MS = 1200;
const MAX_POLL_ATTEMPTS = 25;

async function parseJsonOrThrow(response: Response): Promise<{ data: unknown }> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `Request failed with status ${response.status}`);
  }
  return body as { data: unknown };
}

async function waitUntilProcessed(photoId: string): Promise<PhotoViewModel> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const response = await fetch(`/api/admin/uploads/${photoId}`);
    const { data } = await parseJsonOrThrow(response);
    const photo = data as PhotoViewModel;
    if (photo.status === "ready" || photo.status === "failed") return photo;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error("Timed out waiting for image processing");
}

async function uploadOneFile(
  file: File,
  kind: PhotoKind,
  storyId: string | null | undefined,
  maxUploadBytes: number,
): Promise<PhotoViewModel> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name}: not an image file`);
  }
  if (file.size > maxUploadBytes) {
    throw new Error(`${file.name}: exceeds the ${Math.round(maxUploadBytes / (1024 * 1024))}MB limit`);
  }

  const ticketResponse = await fetch("/api/admin/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, bytes: file.size, kind, storyId }),
  });
  const { data: ticketData } = await parseJsonOrThrow(ticketResponse);
  const { photoId, ticket } = ticketData as { photoId: string; ticket: { url: string; method: string; headers?: Record<string, string> } };

  const blobResponse = await fetch(ticket.url, {
    method: ticket.method,
    headers: ticket.headers,
    body: file,
  });
  if (!blobResponse.ok) {
    const body = await blobResponse.json().catch(() => null);
    throw new Error(body?.error?.message ?? `${file.name}: upload failed`);
  }

  const completeResponse = await fetch(`/api/admin/uploads/${photoId}/complete`, { method: "POST" });
  const { data: completedData } = await parseJsonOrThrow(completeResponse);
  const completed = completedData as PhotoViewModel;

  if (completed.status === "processing") {
    return waitUntilProcessed(photoId);
  }
  return completed;
}

/** Native HTML5 drag-and-drop upload zone implementing the two-step upload flow. */
export function PhotoUploadZone({ kind, storyId, maxUploadBytes, onUploaded }: PhotoUploadZoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<readonly UploadingFile[]>([]);

  function updateFileStatus(key: string, status: UploadingFile["status"], message?: string) {
    setUploadingFiles((current) => current.map((item) => (item.key === key ? { ...item, status, message } : item)));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const entries: UploadingFile[] = Array.from(files).map((file, index) => ({
      key: `${Date.now()}-${index}-${file.name}`,
      name: file.name,
      status: "uploading",
    }));
    setUploadingFiles((current) => [...current, ...entries]);

    await Promise.all(
      Array.from(files).map(async (file, index) => {
        const key = entries[index].key;
        try {
          const photo = await uploadOneFile(file, kind, storyId, maxUploadBytes);
          if (photo.status === "failed") {
            updateFileStatus(key, "failed", photo.error ?? "Processing failed");
            return;
          }
          updateFileStatus(key, "done");
          onUploaded(photo);
        } catch (error) {
          updateFileStatus(key, "failed", error instanceof Error ? error.message : "Upload failed");
        }
      }),
    );
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    void handleFiles(event.dataTransfer.files);
  }

  return (
    <div>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-token border-2 border-dashed p-8 text-center transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease)] ${
          isDraggingOver ? "border-accent bg-accent/5" : "border-border bg-surface"
        }`}
      >
        <span className="text-sm font-medium text-foreground">Drop photos here or click to browse</span>
        <span className="text-xs text-muted">
          JPEG, PNG, or WebP - up to {Math.round(maxUploadBytes / (1024 * 1024))}MB each
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {uploadingFiles.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {uploadingFiles.map((item) => (
            <li key={item.key} className="text-xs text-muted">
              {item.name}: {item.status}
              {item.message ? ` - ${item.message}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
