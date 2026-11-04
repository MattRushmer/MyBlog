import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import type { EntityMap, EntityType, Photo, Story } from "@/core/types";
import { NotFoundError } from "@/core/errors";
import type { ContentStore, ListOptions } from "../types";
import { primaryKey, storyPhotoGsiKey, storySlugGsiKey, typePartitionKey, type Gsi1Key } from "./keys";

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
  return options?.limit !== undefined ? filtered.slice(0, options.limit) : filtered;
}

/** Strips the table's key attributes so callers only ever see entity fields. */
function stripKeys<T>(item: Record<string, unknown>): T {
  const { PK: _pk, SK: _sk, GSI1PK: _gsi1pk, GSI1SK: _gsi1sk, ...entity } = item;
  return entity as T;
}

export class DynamoContentStore implements ContentStore {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  private async queryByPartition<T>(partitionKey: string, indexName?: string): Promise<T[]> {
    const items: T[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: indexName,
          KeyConditionExpression: indexName ? "GSI1PK = :pk" : "PK = :pk",
          ExpressionAttributeValues: { ":pk": partitionKey },
          ExclusiveStartKey: exclusiveStartKey,
        }),
      );
      for (const raw of result.Items ?? []) {
        items.push(stripKeys<T>(raw));
      }
      exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (exclusiveStartKey);
    return items;
  }

  /** Recomputes the GSI1 projection for an entity, or omits it if not applicable. */
  private gsiAttributesFor(type: EntityType, entity: Record<string, unknown>): Record<string, string> | Gsi1Key {
    if (type === "story") {
      return storySlugGsiKey(entity.slug as string);
    }
    if (type === "photo" && entity.kind === "story" && typeof entity.storyId === "string") {
      return storyPhotoGsiKey(entity.storyId, entity.sortOrder as number, entity.id as string);
    }
    return {};
  }

  async list<T extends EntityType>(type: T, options?: ListOptions): Promise<readonly EntityMap[T][]> {
    const items = await this.queryByPartition<EntityMap[T]>(typePartitionKey(type));
    return applyListOptions(items, options);
  }

  async get<T extends EntityType>(type: T, id: string): Promise<EntityMap[T] | null> {
    const result = await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: primaryKey(type, id) }),
    );
    return result.Item ? stripKeys<EntityMap[T]>(result.Item) : null;
  }

  async getStoryBySlug(slug: string, options?: ListOptions): Promise<Story | null> {
    const items = await this.queryByPartition<Story>(storySlugGsiKey(slug).GSI1PK, "GSI1");
    const match = items[0];
    if (!match) return null;
    const [visible] = applyListOptions([match], options);
    return visible ?? null;
  }

  async listPhotosByStory(storyId: string): Promise<readonly Photo[]> {
    return this.queryByPartition<Photo>(storyPhotoGsiKey(storyId, 0, "").GSI1PK, "GSI1");
  }

  async put<T extends EntityType>(type: T, entity: EntityMap[T]): Promise<EntityMap[T]> {
    const record = entity as unknown as Record<string, unknown>;
    const item = {
      ...record,
      ...primaryKey(type, record.id as string),
      ...this.gsiAttributesFor(type, record),
    };
    await this.client.send(new PutCommand({ TableName: this.tableName, Item: item }));
    return entity;
  }

  async patch<T extends EntityType>(
    type: T,
    id: string,
    changes: Partial<Omit<EntityMap[T], "id" | "createdAt">>,
  ): Promise<EntityMap[T]> {
    const existing = await this.get(type, id);
    if (!existing) {
      throw new NotFoundError(type, id);
    }
    const merged = { ...existing, ...changes, updatedAt: new Date().toISOString() } as EntityMap[T];
    return this.put(type, merged);
  }

  async delete(type: EntityType, id: string): Promise<void> {
    await this.client.send(new DeleteCommand({ TableName: this.tableName, Key: primaryKey(type, id) }));
  }

  async reorder(type: EntityType, orderedIds: readonly string[]): Promise<void> {
    for (const [index, id] of orderedIds.entries()) {
      const existing = await this.get(type, id);
      if (!existing) continue;
      const merged = { ...existing, sortOrder: index };
      await this.put(type, merged);
    }
  }
}
