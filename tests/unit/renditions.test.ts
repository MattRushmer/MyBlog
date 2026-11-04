import { describe, expect, it } from "vitest";
import { jpegFallbackWidth, originalKey, renditionKey, targetWidths } from "@/core/images/renditions";

describe("renditions ladder", () => {
  it("never upscales past the original width", () => {
    expect(targetWidths(500)).toEqual([320]);
    expect(targetWidths(3000)).toEqual([320, 640, 1024, 1600, 2400]);
  });

  it("falls back to the original width when smaller than the smallest tier", () => {
    expect(targetWidths(200)).toEqual([200]);
  });

  it("picks the largest available width at or below the fallback tier", () => {
    expect(jpegFallbackWidth(3000)).toBe(1024);
    expect(jpegFallbackWidth(800)).toBe(640);
    expect(jpegFallbackWidth(100)).toBe(100);
  });

  it("builds stable, predictable keys", () => {
    expect(originalKey("abc123", "jpg")).toBe("originals/abc123.jpg");
    expect(renditionKey("abc123", 640, "webp")).toBe("photos/abc123/640.webp");
    expect(renditionKey("abc123", 1024, "jpeg")).toBe("photos/abc123/1024.jpg");
  });
});
