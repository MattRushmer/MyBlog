"use client";

import { useState } from "react";
import type { Project } from "@/core/schemas/project";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
import { useDragReorder } from "@/components/admin/useDragReorder";
import type { PhotoViewModel } from "@/components/admin/photos/types";
import { ProjectForm } from "./ProjectForm";

interface ProjectsManagerProps {
  readonly initialProjects: readonly Project[];
  readonly initialPhotos: readonly PhotoViewModel[];
  readonly maxUploadBytes: number;
}

async function persistOrder(orderedIds: readonly string[]): Promise<void> {
  await fetch("/api/admin/projects/order", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
}

export function ProjectsManager({ initialProjects, initialPhotos, maxUploadBytes }: ProjectsManagerProps) {
  const { items, setItems, draggedId, handleDragStart, handleDragOver, handleDragEnd } = useDragReorder(
    initialProjects,
    persistOrder,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  function handleSaved(project: Project) {
    setItems((current) => {
      const exists = current.some((item) => item.id === project.id);
      return exists ? current.map((item) => (item.id === project.id ? project : item)) : [...current, project];
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
          New project
        </Button>
      )}
      {isCreating && (
        <ProjectForm
          initialPhotos={initialPhotos}
          maxUploadBytes={maxUploadBytes}
          nextSortOrder={items.length}
          onSaved={handleSaved}
          onCancel={() => setIsCreating(false)}
        />
      )}

      <div className="flex flex-col gap-3">
        {items.length === 0 && <p className="text-muted">No projects yet.</p>}
        {items.map((project) =>
          editingId === project.id ? (
            <ProjectForm
              key={project.id}
              initialProject={project}
              initialPhotos={initialPhotos}
              maxUploadBytes={maxUploadBytes}
              nextSortOrder={project.sortOrder}
              onSaved={handleSaved}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div
              key={project.id}
              draggable
              onDragStart={() => handleDragStart(project.id)}
              onDragOver={(event) => handleDragOver(event, project.id)}
              onDragEnd={handleDragEnd}
              className={`flex flex-col gap-3 rounded-token border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between ${
                draggedId === project.id ? "opacity-50" : "border-border"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-11 min-w-11 cursor-grab items-center justify-center text-muted" aria-hidden>
                    ::
                  </span>
                  <span className="font-medium text-foreground">{project.title}</span>
                  <Badge tone={project.status === "published" ? "accent" : "neutral"}>{project.status}</Badge>
                  {project.isFeatured && <Badge tone="accent">Featured</Badge>}
                </div>
                <p className="mt-1 truncate text-sm text-muted">/{project.slug}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditingId(project.id)}>
                  Edit
                </Button>
                <DeleteEntityButton
                  endpoint={`/api/admin/projects/${project.id}`}
                  label="project"
                  onDeleted={() => handleDeleted(project.id)}
                />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
