"use client";

import { useState, type DragEvent } from "react";

interface Orderable {
  readonly id: string;
}

/**
 * Native HTML5 drag-and-drop reordering, shared by Projects/Certifications/
 * Links admin pages. Reorders local state live while dragging; the caller
 * decides what to do once the drop settles (PUT .../order).
 */
export function useDragReorder<T extends Orderable>(initialItems: readonly T[], onReordered: (orderedIds: readonly string[]) => void) {
  const [items, setItems] = useState<readonly T[]>(initialItems);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(event: DragEvent, overId: string) {
    event.preventDefault();
    if (!draggedId || draggedId === overId) return;

    setItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === draggedId);
      const toIndex = current.findIndex((item) => item.id === overId);
      if (fromIndex === -1 || toIndex === -1) return current;

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function handleDragEnd() {
    if (draggedId !== null) {
      onReordered(items.map((item) => item.id));
    }
    setDraggedId(null);
  }

  return { items, setItems, draggedId, handleDragStart, handleDragOver, handleDragEnd };
}
