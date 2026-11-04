import type { EntityMap, EntityType, Story, Photo } from "@/core/types";

export interface ListOptions {
  /** Default false: drafts are excluded unless explicitly requested by admin code. */
  readonly includeDrafts?: boolean;
  readonly limit?: number;
}

export interface ContentStore {
  list<T extends EntityType>(type: T, options?: ListOptions): Promise<readonly EntityMap[T][]>;
  get<T extends EntityType>(type: T, id: string): Promise<EntityMap[T] | null>;

  getStoryBySlug(slug: string, options?: ListOptions): Promise<Story | null>;
  listPhotosByStory(storyId: string): Promise<readonly Photo[]>;

  /** Create or full replace. Caller supplies a fully validated entity. */
  put<T extends EntityType>(type: T, entity: EntityMap[T]): Promise<EntityMap[T]>;

  /** Partial update; sets updatedAt. Rejects with NotFoundError if absent. */
  patch<T extends EntityType>(
    type: T,
    id: string,
    changes: Partial<Omit<EntityMap[T], "id" | "createdAt">>,
  ): Promise<EntityMap[T]>;

  delete(type: EntityType, id: string): Promise<void>;

  /** Bulk sortOrder assignment, index = position in array. */
  reorder(type: EntityType, orderedIds: readonly string[]): Promise<void>;
}
