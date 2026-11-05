"use client";

import { useState } from "react";
import type { Certification } from "@/core/schemas/certification";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
import { useDragReorder } from "@/components/admin/useDragReorder";
import type { PhotoViewModel } from "@/components/admin/photos/types";
import { CertificationForm } from "./CertificationForm";

interface CertificationsManagerProps {
  readonly initialCertifications: readonly Certification[];
  readonly initialPhotos: readonly PhotoViewModel[];
  readonly maxUploadBytes: number;
}

async function persistOrder(orderedIds: readonly string[]): Promise<void> {
  await fetch("/api/admin/certifications/order", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
}

export function CertificationsManager({ initialCertifications, initialPhotos, maxUploadBytes }: CertificationsManagerProps) {
  const { items, setItems, draggedId, handleDragStart, handleDragOver, handleDragEnd } = useDragReorder(
    initialCertifications,
    persistOrder,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  function handleSaved(certification: Certification) {
    setItems((current) => {
      const exists = current.some((item) => item.id === certification.id);
      return exists ? current.map((item) => (item.id === certification.id ? certification : item)) : [...current, certification];
    });
    setEditingId(null);
    setIsCreating(false);
  }

  function handleDeleted(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      {!isCreating && (
        <Button type="button" onClick={() => setIsCreating(true)}>
          New certification
        </Button>
      )}
      {isCreating && (
        <CertificationForm
          initialPhotos={initialPhotos}
          maxUploadBytes={maxUploadBytes}
          nextSortOrder={items.length}
          onSaved={handleSaved}
          onCancel={() => setIsCreating(false)}
        />
      )}

      <div className="flex flex-col gap-3">
        {items.length === 0 && <p className="text-muted">No certifications yet.</p>}
        {items.map((certification) =>
          editingId === certification.id ? (
            <CertificationForm
              key={certification.id}
              initialCertification={certification}
              initialPhotos={initialPhotos}
              maxUploadBytes={maxUploadBytes}
              nextSortOrder={certification.sortOrder}
              onSaved={handleSaved}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div
              key={certification.id}
              draggable
              onDragStart={() => handleDragStart(certification.id)}
              onDragOver={(event) => handleDragOver(event, certification.id)}
              onDragEnd={handleDragEnd}
              className={`flex flex-col gap-3 rounded-token border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between ${
                draggedId === certification.id ? "opacity-50" : "border-border"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-11 min-w-11 cursor-grab items-center justify-center text-muted" aria-hidden>
                    ::
                  </span>
                  <span className="font-medium text-foreground">{certification.name}</span>
                  <Badge tone={certification.state === "earned" ? "accent" : "neutral"}>{certification.state}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{certification.issuer}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditingId(certification.id)}>
                  Edit
                </Button>
                <DeleteEntityButton
                  endpoint={`/api/admin/certifications/${certification.id}`}
                  label="certification"
                  onDeleted={() => handleDeleted(certification.id)}
                />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
