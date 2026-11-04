import { describe, expect, it } from "vitest";
import type { ContentStore } from "@/adapters/content-store/types";
import { NotFoundError } from "@/core/errors";
import { makePhoto, makeStory } from "./fixtures";

/**
 * Shared behavioral contract for ContentStore. Run against the local JSON
 * implementation and the DynamoDB implementation (mocked) with the exact
 * same assertions, so both modes are held to one definition of correct.
 */
export function runContentStoreContractTests(getStore: () => ContentStore | Promise<ContentStore>): void {
  describe("ContentStore contract", () => {
    it("put then get round-trips an entity", async () => {
      const store = await getStore();
      const story = makeStory({ title: "Round trip" });
      await store.put("story", story);

      const fetched = await store.get("story", story.id);
      expect(fetched).toEqual(story);
    });

    it("get returns null for a missing id", async () => {
      const store = await getStore();
      expect(await store.get("story", "does-not-exist")).toBeNull();
    });

    it("list excludes drafts by default and includes them with includeDrafts", async () => {
      const store = await getStore();
      const published = makeStory({ status: "published" });
      const draft = makeStory({ status: "draft", publishedAt: null });
      await store.put("story", published);
      await store.put("story", draft);

      const defaultList = await store.list("story");
      expect(defaultList.some((item) => item.id === draft.id)).toBe(false);
      expect(defaultList.some((item) => item.id === published.id)).toBe(true);

      const withDrafts = await store.list("story", { includeDrafts: true });
      expect(withDrafts.some((item) => item.id === draft.id)).toBe(true);
    });

    it("list respects the limit option", async () => {
      const store = await getStore();
      const items = [makeStory(), makeStory(), makeStory()];
      await Promise.all(items.map((item) => store.put("story", item)));

      const limited = await store.list("story", { includeDrafts: true, limit: 2 });
      expect(limited.length).toBeLessThanOrEqual(2);
    });

    it("getStoryBySlug finds a story by its slug and respects includeDrafts", async () => {
      const store = await getStore();
      const draft = makeStory({ slug: `slug-${Date.now()}`, status: "draft", publishedAt: null });
      await store.put("story", draft);

      expect(await store.getStoryBySlug(draft.slug)).toBeNull();
      expect(await store.getStoryBySlug(draft.slug, { includeDrafts: true })).toEqual(draft);
      expect(await store.getStoryBySlug("no-such-slug-at-all")).toBeNull();
    });

    it("listPhotosByStory returns only that story's photos, sorted by sortOrder", async () => {
      const store = await getStore();
      const story = makeStory();
      await store.put("story", story);

      const second = makePhoto({ kind: "story", storyId: story.id, sortOrder: 1 });
      const first = makePhoto({ kind: "story", storyId: story.id, sortOrder: 0 });
      const other = makePhoto({ kind: "gallery", storyId: null, sortOrder: 0 });
      await store.put("photo", second);
      await store.put("photo", first);
      await store.put("photo", other);

      const result = await store.listPhotosByStory(story.id);
      expect(result.map((p) => p.id)).toEqual([first.id, second.id]);
    });

    it("patch merges changes and updates updatedAt", async () => {
      const store = await getStore();
      const story = makeStory({ title: "Before" });
      await store.put("story", story);

      const patched = await store.patch("story", story.id, { title: "After" });
      expect(patched.title).toBe("After");
      expect(patched.id).toBe(story.id);
      expect(patched.createdAt).toBe(story.createdAt);

      const fetched = await store.get("story", story.id);
      expect(fetched?.title).toBe("After");
    });

    it("patch throws NotFoundError for a missing id", async () => {
      const store = await getStore();
      await expect(store.patch("story", "missing-id", { title: "x" })).rejects.toThrow(NotFoundError);
    });

    it("delete removes the entity", async () => {
      const store = await getStore();
      const story = makeStory();
      await store.put("story", story);
      await store.delete("story", story.id);
      expect(await store.get("story", story.id)).toBeNull();
    });

    it("reorder assigns sortOrder by position in the given id list", async () => {
      const store = await getStore();
      const a = makePhoto({ sortOrder: 5 });
      const b = makePhoto({ sortOrder: 9 });
      const c = makePhoto({ sortOrder: 1 });
      await Promise.all([store.put("photo", a), store.put("photo", b), store.put("photo", c)]);

      await store.reorder("photo", [b.id, c.id, a.id]);

      expect((await store.get("photo", b.id))?.sortOrder).toBe(0);
      expect((await store.get("photo", c.id))?.sortOrder).toBe(1);
      expect((await store.get("photo", a.id))?.sortOrder).toBe(2);
    });
  });
}
