import { describe, expect, it } from "vitest";
import type { FileStorage } from "@/adapters/file-storage/types";

/**
 * Shared behavioral contract for FileStorage. Run against the local disk
 * implementation and the S3 implementation (mocked) with the exact same
 * assertions.
 */
export function runFileStorageContractTests(getStorage: () => FileStorage | Promise<FileStorage>): void {
  describe("FileStorage contract", () => {
    it("put then get round-trips bytes and content type", async () => {
      const storage = await getStorage();
      const key = `test/${Math.random().toString(36).slice(2)}.bin`;
      const body = new Uint8Array([1, 2, 3, 4, 5]);

      await storage.put(key, body, "application/octet-stream");
      const fetched = await storage.get(key);

      expect(fetched).not.toBeNull();
      expect(Array.from(fetched!.body)).toEqual([1, 2, 3, 4, 5]);
      expect(fetched!.contentType).toBe("application/octet-stream");
    });

    it("get returns null for a missing key", async () => {
      const storage = await getStorage();
      expect(await storage.get("does/not/exist.bin")).toBeNull();
    });

    it("head reports byte count and content type without the body", async () => {
      const storage = await getStorage();
      const key = `test/${Math.random().toString(36).slice(2)}.bin`;
      const body = new Uint8Array(10);
      await storage.put(key, body, "image/webp");

      const head = await storage.head(key);
      expect(head).toEqual({ key, bytes: 10, contentType: "image/webp" });
    });

    it("head returns null for a missing key", async () => {
      const storage = await getStorage();
      expect(await storage.head("does/not/exist.bin")).toBeNull();
    });

    it("delete removes the object", async () => {
      const storage = await getStorage();
      const key = `test/${Math.random().toString(36).slice(2)}.bin`;
      await storage.put(key, new Uint8Array([1]), "application/octet-stream");

      await storage.delete([key]);

      expect(await storage.get(key)).toBeNull();
    });

    it("createUploadTicket returns a ticket matching the request", async () => {
      const storage = await getStorage();
      const key = `uploads/${Math.random().toString(36).slice(2)}.jpg`;

      const ticket = await storage.createUploadTicket({ key, contentType: "image/jpeg", maxBytes: 1024 });

      expect(ticket.key).toBe(key);
      expect(ticket.maxBytes).toBe(1024);
      expect(new Date(ticket.expiresAt).getTime()).toBeGreaterThan(Date.now());
      expect(typeof ticket.url).toBe("string");
      expect(ticket.url.length).toBeGreaterThan(0);
    });

    it("publicUrl returns a non-empty string containing the key", async () => {
      const storage = await getStorage();
      const key = "photos/abc/640.webp";
      expect(storage.publicUrl(key)).toContain("640.webp");
    });
  });
}
