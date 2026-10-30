import { describe, it, expect, vi } from "vitest";
import {
  isDetailPageUrl,
  normalizeImageUrl,
  resolveMasterAsset,
  resolveSrcset,
} from "@/lib/image-resolver";

describe("resolveSrcset", () => {
  it("selects the highest width descriptor", async () => {
    const urls = await resolveSrcset(
      "/a.jpg 640w, /b.jpg 1280w, /c.jpg 2455w",
    );
    expect(urls[0]).toBe("/c.jpg");
  });

  it("selects the highest density descriptor", async () => {
    const urls = await resolveSrcset("/a.jpg 1x, /b.jpg 2x, /c.jpg 3x");
    expect(urls[0]).toBe("/c.jpg");
  });

  it("deduplicates candidates by pathname", async () => {
    const urls = await resolveSrcset(
      "https://example.com/img.jpg 640w, https://example.com/img.jpg?x=1 1280w",
    );
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("img.jpg");
  });

  it("returns an empty array for nullish input", async () => {
    expect(await resolveSrcset(undefined)).toEqual([]);
    expect(await resolveSrcset(null)).toEqual([]);
  });
});

describe("normalizeImageUrl", () => {
  it("normalizes Unsplash URLs to q=100 without resize params", async () => {
    const result = await normalizeImageUrl(
      "https://images.unsplash.com/photo-1?w=500&h=600&fit=crop&q=80",
    );
    const parsed = new URL(result);
    expect(parsed.searchParams.get("q")).toBe("100");
    expect(parsed.searchParams.has("w")).toBe(false);
    expect(parsed.searchParams.has("h")).toBe(false);
    expect(parsed.searchParams.has("fit")).toBe(false);
  });

  it("removes common CDN resize query params", async () => {
    const result = await normalizeImageUrl(
      "https://cdn.example.com/image.jpg?width=300&height=200&fit=cover&dpr=2&fm=jpg",
    );
    const parsed = new URL(result);
    for (const key of ["width", "height", "fit", "dpr", "fm"]) {
      expect(parsed.searchParams.has(key)).toBe(false);
    }
  });

  it("strips path-based resize segments", async () => {
    const result = await normalizeImageUrl(
      "https://cdn.example.com/w_300,h_200/image.jpg",
    );
    expect(result).toBe("https://cdn.example.com/image.jpg");
  });

  it("cleans WordPress dimension suffixes", async () => {
    const result = await normalizeImageUrl(
      "https://example.com/wp-content/uploads/image-150x150.jpg",
    );
    expect(result).toContain("image.jpg");
  });
});

describe("isDetailPageUrl", () => {
  it("detects Unsplash photo pages", () => {
    expect(isDetailPageUrl("https://unsplash.com/photos/abc123")).toBe(true);
  });

  it("detects generic photo pages", () => {
    expect(isDetailPageUrl("https://example.com/photos/42")).toBe(true);
  });

  it("rejects ordinary image URLs", () => {
    expect(isDetailPageUrl("https://example.com/images/photo.jpg")).toBe(false);
  });
});

describe("resolveMasterAsset", () => {
  it("prefers OpenGraph image and resolves relative URLs", async () => {
    const html =
      '<html><head><meta property="og:image" content="/master.jpg" /></head></html>';
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => html,
      })) as unknown as typeof fetch,
    );

    const result = await resolveMasterAsset("https://example.com/detail");
    expect(result).toBe("https://example.com/master.jpg");
  });

  it("falls back to JSON-LD contentUrl", async () => {
    const html =
      '<html><head><script type="application/ld+json">{"contentUrl":"/structured.png"}</script></head></html>';
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => html,
      })) as unknown as typeof fetch,
    );

    const result = await resolveMasterAsset("https://example.com/detail");
    expect(result).toBe("https://example.com/structured.png");
  });

  it("returns undefined on failed fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, text: async () => "" })) as unknown as typeof fetch,
    );
    expect(await resolveMasterAsset("https://example.com/detail")).toBeUndefined();
  });
});
