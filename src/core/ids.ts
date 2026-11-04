import { ulid } from "ulid";

/** Sortable, coordination-free unique id. Used as the `id` of every entity. */
export function createId(): string {
  return ulid();
}
