import { expect, test } from "@playwright/test";

const FIXTURE_URL =
  "http://localhost:3000/test-fixtures/gallery.html";

async function readExtractEvents(request: any, body: Record<string, unknown>) {
  const response = await request.post("/api/extract", { data: body });
  expect(response.status()).toBe(200);
  const text = await response.text();
  const events: any[] = text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line: string) => JSON.parse(line));
  return { response, events };
}

test.describe("extract API", () => {
  test("rejects missing url", async ({ request }) => {
    const response = await request.post("/api/extract", { data: {} });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBeTruthy();
  });

  test("rejects non-http protocols", async ({ request }) => {
    const response = await request.post("/api/extract", {
      data: { url: "ftp://example.com" },
    });
    expect(response.status()).toBe(400);
  });

  test("extracts fixture gallery and filters small images by default", async ({
    request,
  }) => {
    const { response, events } = await readExtractEvents(request, {
      url: FIXTURE_URL,
    });

    expect(response.headers()["content-type"]).toContain("ndjson");
    const stages = events
      .filter((event:any) => event.type === "progress")
      .map((event) => event.progress.stage);
    expect(stages).toEqual([
      "connecting",
      "lazy-loading",
      "analyzing",
      "ready",
    ]);

    const resultEvent = events.find((event:any) => event.type === "result");
    expect(resultEvent).toBeTruthy();
    const result = resultEvent.result;
    expect(result.success).toBe(true);
    expect(result.targetUrl).toBe(FIXTURE_URL);
    expect(result.count).toBe(3);

    const sourceUrls = result.images.map((image: any) => image.sourceUrl);
    expect(new Set(sourceUrls).size).toBe(sourceUrls.length);
    expect(sourceUrls.some((url: string) => url.includes("master.png"))).toBe(true);
    expect(sourceUrls.some((url: string) => url.includes("icon.png"))).toBe(false);
  });

  test("minSize=0 returns all candidates including tiny images", async ({
    request,
  }) => {
    const { events } = await readExtractEvents(request, {
      url: FIXTURE_URL,
      minSize: 0,
    });
    const result = events.find((event:any) => event.type === "result").result;
    expect(result.count).toBe(4);
    const sourceUrls = result.images.map((image: any) => image.sourceUrl);
    expect(sourceUrls.some((url: string) => url.includes("icon.png"))).toBe(true);
  });

  test("minSize=500 filters by threshold", async ({ request }) => {
    const { events } = await readExtractEvents(request, {
      url: FIXTURE_URL,
      minSize: 500,
    });
    const result = events.find((event:any) => event.type === "result").result;
    expect(result.count).toBeLessThanOrEqual(3);
    for (const image of result.images) {
      expect(image.width).toBeGreaterThanOrEqual(500);
      expect(image.height).toBeGreaterThanOrEqual(500);
    }
  });

  test("detail URL is preserved for wrapped thumbnails", async ({ request }) => {
    const { events } = await readExtractEvents(request, {
      url: FIXTURE_URL,
      minSize: 0,
    });
    const result = events.find((event:any) => event.type === "result").result;
    const wrapped = result.images.find((image: any) =>
      image.sourceUrl.includes("icon.png"),
    );
    expect(wrapped).toBeTruthy();
    expect(wrapped.detailUrl).toContain("/test-fixtures/photos/detail.html");
  });
});
