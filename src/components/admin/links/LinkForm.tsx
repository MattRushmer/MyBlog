"use client";

import { useState, type FormEvent } from "react";
import type { Link } from "@/core/schemas/link";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput, CheckboxField } from "@/components/admin/form-controls";
import { IconPicker } from "./IconPicker";

interface LinkFormProps {
  readonly initialLink?: Link;
  readonly nextSortOrder: number;
  readonly onSaved: (link: Link) => void;
  readonly onCancel: () => void;
}

export function LinkForm({ initialLink, nextSortOrder, onSaved, onCancel }: LinkFormProps) {
  const [label, setLabel] = useState(initialLink?.label ?? "");
  const [url, setUrl] = useState(initialLink?.url ?? "");
  const [iconKey, setIconKey] = useState(initialLink?.iconKey ?? "generic:link");
  const [description, setDescription] = useState(initialLink?.description ?? "");
  const [isVisible, setIsVisible] = useState(initialLink?.isVisible ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const payload = {
      label,
      url,
      iconKey,
      description: description.trim() || null,
      isVisible,
      sortOrder: initialLink?.sortOrder ?? nextSortOrder,
    };

    setIsSubmitting(true);
    try {
      const endpoint = initialLink ? `/api/admin/links/${initialLink.id}` : "/api/admin/links";
      const response = await fetch(endpoint, {
        method: initialLink ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Failed to save link");
        return;
      }
      onSaved(body.data as Link);
    } catch {
      setError("Network error - please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-token border border-border bg-surface p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Label">
          <TextInput required value={label} onChange={(event) => setLabel(event.target.value)} />
        </Field>
        <Field label="URL">
          <TextInput type="url" required value={url} onChange={(event) => setUrl(event.target.value)} />
        </Field>
      </div>

      <Field label="Icon">
        <IconPicker value={iconKey} onChange={setIconKey} />
      </Field>

      <Field label="Description">
        <TextArea rows={2} maxLength={300} value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>

      <CheckboxField label="Visible on site" checked={isVisible} onChange={setIsVisible} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save link"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
