"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Story } from "@/core/schemas/story";
import { slugify } from "@/core/slug";
import { StoryMarkdown, type StoryPhotoViewModel } from "@/components/markdown/StoryMarkdown";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput, CheckboxField } from "@/components/admin/form-controls";
import { CoverPhotoPicker } from "@/components/admin/photos/CoverPhotoPicker";
import type { PhotoViewModel } from "@/components/admin/photos/types";

interface StoryFormProps {
  readonly mode: "create" | "edit";
  readonly initialStory?: Story;
  readonly initialPhotos: readonly PhotoViewModel[];
  readonly maxUploadBytes: number;
}

const DEBOUNCE_MS = 200;

function buildPhotoPreviewMap(photos: readonly PhotoViewModel[]): Record<string, StoryPhotoViewModel> {
  return Object.fromEntries(
    photos.map((photo) => [
      photo.id,
      {
        width: photo.width,
        height: photo.height,
        altText: photo.altText,
        caption: photo.caption,
        renditions: photo.renditions,
        blurDataUrl: photo.blurDataUrl,
      },
    ]),
  );
}

export function StoryForm({ mode, initialStory, initialPhotos, maxUploadBytes }: StoryFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialStory?.title ?? "");
  const [slug, setSlug] = useState(initialStory?.slug ?? "");
  const [isSlugTouched, setIsSlugTouched] = useState(mode === "edit");
  const [excerpt, setExcerpt] = useState(initialStory?.excerpt ?? "");
  const [tagsInput, setTagsInput] = useState(initialStory?.tags.join(", ") ?? "");
  const [bodyMarkdown, setBodyMarkdown] = useState(initialStory?.bodyMarkdown ?? "");
  const [debouncedMarkdown, setDebouncedMarkdown] = useState(bodyMarkdown);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(initialStory?.coverPhotoId ?? null);
  const [status, setStatus] = useState<Story["status"]>(initialStory?.status ?? "draft");
  const [isFeatured, setIsFeatured] = useState(initialStory?.isFeatured ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMarkdown(bodyMarkdown), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [bodyMarkdown]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!isSlugTouched) {
      setSlug(slugify(value));
    }
  }

  const photoPreviewMap = useMemo(() => buildPhotoPreviewMap(initialPhotos), [initialPhotos]);
  const resolveUrl = useMemo(() => {
    const byKey = new Map(initialPhotos.flatMap((photo) => photo.renditions.map((r) => [r.key, r.url] as const)));
    return (key: string) => byKey.get(key) ?? "";
  }, [initialPhotos]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const wasPublished = initialStory?.status === "published";
    const publishedAt = status === "published" ? initialStory?.publishedAt ?? new Date().toISOString() : wasPublished ? initialStory?.publishedAt ?? null : null;

    const payload = {
      title,
      slug,
      excerpt,
      bodyMarkdown,
      coverPhotoId,
      tags,
      status,
      publishedAt,
      isFeatured,
    };

    setIsSubmitting(true);
    try {
      const endpoint = mode === "create" ? "/api/admin/stories" : `/api/admin/stories/${initialStory!.id}`;
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Failed to save story");
        return;
      }
      router.push("/admin/stories");
    } catch {
      setError("Network error - please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Title">
          <TextInput required value={title} onChange={(event) => handleTitleChange(event.target.value)} />
        </Field>
        <Field label="Slug" hint="Auto-filled from the title - edit if you want a different URL.">
          <TextInput
            required
            value={slug}
            onChange={(event) => {
              setIsSlugTouched(true);
              setSlug(event.target.value);
            }}
          />
        </Field>
      </div>

      <Field label="Excerpt">
        <TextArea rows={2} maxLength={500} value={excerpt} onChange={(event) => setExcerpt(event.target.value)} />
      </Field>

      <Field label="Tags" hint="Comma-separated.">
        <TextInput value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} />
      </Field>

      <Field label="Cover photo">
        <CoverPhotoPicker
          initialPhotos={initialPhotos}
          selectedId={coverPhotoId}
          onChange={setCoverPhotoId}
          maxUploadBytes={maxUploadBytes}
          storyId={initialStory?.id ?? null}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Body (Markdown)">
          <TextArea
            rows={20}
            value={bodyMarkdown}
            onChange={(event) => setBodyMarkdown(event.target.value)}
            className="font-mono text-sm"
          />
        </Field>
        <Field label="Preview">
          <div className="h-full overflow-y-auto rounded-token border border-border bg-surface p-4">
            <StoryMarkdown markdown={debouncedMarkdown} photos={photoPreviewMap} resolveUrl={resolveUrl} />
          </div>
        </Field>
      </div>

      <div className="flex items-center gap-6">
        <Field label="Status">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as Story["status"])}
            className="rounded-token border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </Field>
        <CheckboxField label="Featured" checked={isFeatured} onChange={setIsFeatured} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save story"}
        </Button>
      </div>
    </form>
  );
}
