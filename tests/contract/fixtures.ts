import { createId } from "@/core/ids";
import type { Photo, Story } from "@/core/types";

export function makeStory(overrides: Partial<Story> = {}): Story {
  const now = new Date().toISOString();
  return {
    id: createId(),
    slug: `story-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test story",
    excerpt: "An excerpt",
    bodyMarkdown: "# Hello",
    coverPhotoId: null,
    tags: [],
    status: "published",
    publishedAt: now,
    readingTimeMinutes: 1,
    isFeatured: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makePhoto(overrides: Partial<Photo> = {}): Photo {
  const now = new Date().toISOString();
  return {
    id: createId(),
    kind: "gallery",
    storyId: null,
    altText: "A photo",
    caption: null,
    originalKey: `originals/${createId()}.jpg`,
    originalFilename: "photo.jpg",
    mimeType: "image/jpeg",
    bytes: 1024,
    width: 800,
    height: 600,
    renditions: [],
    blurDataUrl: null,
    status: "ready",
    error: null,
    takenAt: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
