import type { EntityMap, EntityType, Photo, Story } from "@/core/types";
import { NotFoundError } from "@/core/errors";
import type { ContentStore, ListOptions } from "../types";
import { entityFilePath } from "./paths";
import { readEntities, updateEntities } from "./json-file-store";

interface Draftable {
  readonly status: "draft" | "published";
}

function isDraftable(item: unknown): item is Draftable {
  return typeof item === "object" && item !== null && "status" in item;
}

function applyListOptions<T>(items: readonly T[], options: ListOptions | undefined): readonly T[] {
  const includeDrafts = options?.includeDrafts ?? false;
  const filtered = includeDrafts
    ? items
    : items.filter((item) => !isDraftable(item) || item.status === "published");
  if (options?.limit !== undefined) {
    return filtered.slice(0, options.limit);
  }
  return filtered;
}

export class LocalContentStore implements ContentStore {
  constructor(private readonly dataDir: string) {}

  private pathFor(type: EntityType): string {
    return entityFilePath(this.dataDir, type);
  }

  async list<T extends EntityType>(type: T, options?: ListOptions): Promise<readonly EntityMap[T][]> {
    const items = await readEntities<EntityMap[T]>(this.pathFor(type));
    return applyListOptions(items, options);
  }

  async get<T extends EntityType>(type: T, id: string): Promise<EntityMap[T] | null> {
    const items = await readEntities<EntityMap[T]>(this.pathFor(type));
    return items.find((item) => item.id === id) ?? null;
  }

  async getStoryBySlug(slug: string, options?: ListOptions): Promise<Story | null> {
    const items = await readEntities<Story>(this.pathFor("story"));
    const match = items.find((item) => item.slug === slug);
    if (!match) return null;
    const [visible] = applyListOptions([match], options);
    return visible ?? null;
  }

  async listPhotosByStory(storyId: string): Promise<readonly Photo[]> {
    const items = await readEntities<Photo>(this.pathFor("photo"));
    return items
      .filter((item) => item.storyId === storyId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async put<T extends EntityType>(type: T, entity: EntityMap[T]): Promise<EntityMap[T]> {
    await updateEntities<EntityMap[T]>(this.pathFor(type), (items) => {
      const index = items.findIndex((item) => item.id === entity.id);
      if (index === -1) return [...items, entity];
      const next = [...items];
      next[index] = entity;
      return next;
    });
    return entity;
  }

  async patch<T extends EntityType>(
    type: T,
    id: string,
    changes: Partial<Omit<EntityMap[T], "id" | "createdAt">>,
  ): Promise<EntityMap[T]> {
    let updated: EntityMap[T] | null = null;
    await updateEntities<EntityMap[T]>(this.pathFor(type), (items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new NotFoundError(type, id);
      }
      const merged = { ...items[index], ...changes, updatedAt: new Date().toISOString() } as EntityMap[T];
      const next = [...items];
      next[index] = merged;
      updated = merged;
      return next;
    });
    if (!updated) {
      throw new NotFoundError(type, id);
    }
    return updated;
  }

  async delete(type: EntityType, id: string): Promise<void> {
    await updateEntities<{ id: string }>(this.pathFor(type), (items) => items.filter((item) => item.id !== id));
  }

  async reorder(type: EntityType, orderedIds: readonly string[]): Promise<void> {
    const positions = new Map(orderedIds.map((id, index) => [id, index]));
    await updateEntities<{ id: string; sortOrder: number }>(this.pathFor(type), (items) =>
      items.map((item) => {
        const position = positions.get(item.id);
        return position === undefined ? item : { ...item, sortOrder: position };
      }),
    );
  }
}
