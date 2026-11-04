"use client";

import { useState, type FormEvent } from "react";
import { slugify } from "@/core/slug";
import type { Project } from "@/core/schemas/project";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput, CheckboxField } from "@/components/admin/form-controls";
import { CoverPhotoPicker } from "@/components/admin/photos/CoverPhotoPicker";
import type { PhotoViewModel } from "@/components/admin/photos/types";

interface ProjectFormProps {
  readonly initialProject?: Project;
  readonly initialPhotos: readonly PhotoViewModel[];
  readonly maxUploadBytes: number;
  readonly nextSortOrder: number;
  readonly onSaved: (project: Project) => void;
  readonly onCancel: () => void;
}

export function ProjectForm({ initialProject, initialPhotos, maxUploadBytes, nextSortOrder, onSaved, onCancel }: ProjectFormProps) {
  const [title, setTitle] = useState(initialProject?.title ?? "");
  const [slug, setSlug] = useState(initialProject?.slug ?? "");
  const [isSlugTouched, setIsSlugTouched] = useState(Boolean(initialProject));
  const [description, setDescription] = useState(initialProject?.description ?? "");
  const [techTagsInput, setTechTagsInput] = useState(initialProject?.techTags.join(", ") ?? "");
  const [repoUrl, setRepoUrl] = useState(initialProject?.repoUrl ?? "");
  const [liveUrl, setLiveUrl] = useState(initialProject?.liveUrl ?? "");
  const [screenshotPhotoId, setScreenshotPhotoId] = useState<string | null>(initialProject?.screenshotPhotoId ?? null);
  const [status, setStatus] = useState<Project["status"]>(initialProject?.status ?? "draft");
  const [isFeatured, setIsFeatured] = useState(initialProject?.isFeatured ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const techTags = techTagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const payload = {
      title,
      slug,
      description,
      techTags,
      repoUrl: repoUrl.trim() || null,
      liveUrl: liveUrl.trim() || null,
      screenshotPhotoId,
      isFeatured,
      status,
      sortOrder: initialProject?.sortOrder ?? nextSortOrder,
    };

    setIsSubmitting(true);
    try {
      const endpoint = initialProject ? `/api/admin/projects/${initialProject.id}` : "/api/admin/projects";
      const response = await fetch(endpoint, {
        method: initialProject ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Failed to save project");
        return;
      }
      onSaved(body.data as Project);
    } catch {
      setError("Network error - please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-token border border-border bg-surface p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Title">
          <TextInput
            required
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!isSlugTouched) setSlug(slugify(event.target.value));
            }}
          />
        </Field>
        <Field label="Slug">
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

      <Field label="Description">
        <TextArea required rows={3} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>

      <Field label="Tech tags" hint="Comma-separated.">
        <TextInput value={techTagsInput} onChange={(event) => setTechTagsInput(event.target.value)} />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Repo URL">
          <TextInput type="url" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} />
        </Field>
        <Field label="Live URL">
          <TextInput type="url" value={liveUrl} onChange={(event) => setLiveUrl(event.target.value)} />
        </Field>
      </div>

      <Field label="Screenshot">
        <CoverPhotoPicker
          initialPhotos={initialPhotos}
          selectedId={screenshotPhotoId}
          onChange={setScreenshotPhotoId}
          maxUploadBytes={maxUploadBytes}
          uploadKind="asset"
        />
      </Field>

      <div className="flex items-center gap-6">
        <Field label="Status">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as Project["status"])}
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
          {isSubmitting ? "Saving..." : "Save project"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
