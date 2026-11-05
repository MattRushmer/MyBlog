"use client";

import { useState } from "react";
import type { Link } from "@/core/schemas/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
import { useDragReorder } from "@/components/admin/useDragReorder";
import { LinkForm } from "./LinkForm";

interface LinksManagerProps {
  readonly initialLinks: readonly Link[];
}

async function persistOrder(orderedIds: readonly string[]): Promise<void> {
  await fetch("/api/admin/links/order", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
}

export function LinksManager({ initialLinks }: LinksManagerProps) {
  const { items, setItems, draggedId, handleDragStart, handleDragOver, handleDragEnd } = useDragReorder(initialLinks, persistOrder);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  function handleSaved(link: Link) {
    setItems((current) => {
      const exists = current.some((item) => item.id === link.id);
      return exists ? current.map((item) => (item.id === link.id ? link : item)) : [...current, link];
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
          New link
        </Button>
      )}
      {isCreating && <LinkForm nextSortOrder={items.length} onSaved={handleSaved} onCancel={() => setIsCreating(false)} />}

      <div className="flex flex-col gap-3">
        {items.length === 0 && <p className="text-muted">No links yet.</p>}
        {items.map((link) =>
          editingId === link.id ? (
            <LinkForm key={link.id} initialLink={link} nextSortOrder={link.sortOrder} onSaved={handleSaved} onCancel={() => setEditingId(null)} />
          ) : (
            <div
              key={link.id}
              draggable
              onDragStart={() => handleDragStart(link.id)}
              onDragOver={(event) => handleDragOver(event, link.id)}
              onDragEnd={handleDragEnd}
              className={`flex flex-col gap-3 rounded-token border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between ${
                draggedId === link.id ? "opacity-50" : "border-border"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex min-h-11 min-w-11 flex-none cursor-grab items-center justify-center text-muted" aria-hidden>
                  ::
                </span>
                <Icon iconKey={link.iconKey} className="h-5 w-5 flex-none text-foreground" aria-hidden />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{link.label}</span>
                    {!link.isVisible && <Badge>Hidden</Badge>}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">{link.url}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditingId(link.id)}>
                  Edit
                </Button>
                <DeleteEntityButton endpoint={`/api/admin/links/${link.id}`} label="link" onDeleted={() => handleDeleted(link.id)} />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
