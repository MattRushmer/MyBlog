import { describe, expect, it } from "vitest";
import { slugify } from "@/core/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugify("Café Résumé")).toBe("cafe-resume");
  });

  it("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(slugify("foo!!  bar---baz")).toBe("foo-bar-baz");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  -- weird input -- ")).toBe("weird-input");
  });

  it("caps length at 96 characters", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(96);
  });
});
