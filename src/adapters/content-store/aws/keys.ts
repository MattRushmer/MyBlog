import type { EntityType } from "@/core/types";

export interface PrimaryKey {
  readonly PK: string;
  readonly SK: string;
}

export interface Gsi1Key {
  readonly GSI1PK: string;
  readonly GSI1SK: string;
}

const TYPE_PREFIX: Record<EntityType, string> = {
  story: "STORY",
  photo: "PHOTO",
  project: "PROJECT",
  certification: "CERTIFICATION",
  link: "LINK",
};

export function primaryKey(type: EntityType, id: string): PrimaryKey {
  return { PK: `TYPE#${TYPE_PREFIX[type]}`, SK: `ID#${id}` };
}

export function typePartitionKey(type: EntityType): string {
  return `TYPE#${TYPE_PREFIX[type]}`;
}

export function storySlugGsiKey(slug: string): Gsi1Key {
  return { GSI1PK: `STORY#SLUG#${slug}`, GSI1SK: "STORY" };
}

/** Zero-padded so lexicographic (DynamoDB) sort order matches numeric sortOrder. */
export function storyPhotoGsiKey(storyId: string, sortOrder: number, photoId: string): Gsi1Key {
  const padded = String(Math.max(sortOrder, 0)).padStart(8, "0");
  return { GSI1PK: `STORY#${storyId}#PHOTOS`, GSI1SK: `SORT#${padded}#${photoId}` };
}
