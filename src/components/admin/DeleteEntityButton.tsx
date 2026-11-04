"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface DeleteEntityButtonProps {
  readonly endpoint: string;
  readonly label: string;
  readonly onDeleted?: () => void;
}

/** Confirm, DELETE, then refresh the current route's server data. Shared by every admin list page. */
export function DeleteEntityButton({ endpoint, label, onDeleted }: DeleteEntityButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        window.alert(body?.error?.message ?? `Failed to delete ${label}`);
        return;
      }
      onDeleted?.();
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button type="button" variant="ghost" onClick={handleDelete} disabled={isDeleting}>
      {isDeleting ? "Deleting..." : "Delete"}
    </Button>
  );
}
