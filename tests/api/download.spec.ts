import AdmZip from "adm-zip";
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const FIXTURE_URL =
  "http://localhost:3000/test-fixtures/gallery.html";
const MASTER_PATH = path.resolve(
  process.cwd(),
  "public/test-fixtures/images/master.png",
);

test.describe("download API", () => {
  test("rejects empty items", async ({ request }) => {
    const response = await request.post("/api/download", { data: { items: [] } });
    expect(response.status()).toBe(400);
  });

  test("streams a single image", async ({ request }) => {
    const response = await request.post("/api/download", {
      data: {
        items: [
          {
            id: "single",
            sourceUrl: "http://localhost:3000/test-fixtures/images/photo.png",
            filename: "photo.png",
          },
        ],
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    const disposition = response.headers()["content-disposition"] ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("photo.png");

    const body = await response.body();
    expect(body.length).toBeGreaterThan(0);
    expect(body.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });

  test("resolves detail pages to the master asset", async ({ request }) => {
    const masterSize = fs.statSync(MASTER_PATH).size;
    const response = await request.post("/api/download", {
      data: {
        items: [
          {
            id: "wrapped",
            sourceUrl: "http://localhost:3000/test-fixtures/images/icon.png",
            detailUrl:
              "http://localhost:3000/test-fixtures/photos/detail.html?img=hero.png",
            filename: "wrapped.png",
          },
        ],
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.body();
    expect(body.length).toBe(masterSize);
  });

  test("streams a zip for multiple items", async ({ request }) => {
    const response = await request.post("/api/download", {
      data: {
        items: [
          {
            id: "one",
            sourceUrl: "http://localhost:3000/test-fixtures/images/hero.png",
            filename: "hero.png",
          },
          {
            id: "two",
            sourceUrl: "http://localhost:3000/test-fixtures/images/photo.png",
            filename: "photo.png",
          },
        ],
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("application/zip");
    const disposition = response.headers()["content-disposition"] ?? "";
    expect(disposition).toContain(".zip");

    const body = await response.body();
    expect(body.subarray(0, 2).toString()).toBe("PK");

    const zip = new AdmZip(body);
    const entries = zip.getEntries();
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.getData().length).toBeGreaterThan(0);
    }
  });

  test("deduplicates zip entry names", async ({ request }) => {
    const response = await request.post("/api/download", {
      data: {
        items: [
          {
            id: "a",
            sourceUrl: "http://localhost:3000/test-fixtures/images/photo.png",
            filename: "same.png",
          },
          {
            id: "b",
            sourceUrl: "http://localhost:3000/test-fixtures/images/photo.png",
            filename: "same.png",
          },
        ],
      },
    });

    const zip = new AdmZip(await response.body());
    const names = zip.getEntries().map((entry) => entry.entryName);
    expect(new Set(names).size).toBe(names.length);
  });
});
