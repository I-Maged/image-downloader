import { NextResponse } from "next/server";
import { scrapeImages } from "@/lib/scraper";
import type { ExtractionResult, ExtractionStreamEvent } from "@/lib/types";

const DEFAULT_MIN_SIZE = 150;

/**
 * Create a streaming response body that emits NDJSON events:
 * - `{ type: "progress", progress }` as the pipeline advances.
 * - `{ type: "result", result }` once extraction completes.
 * - `{ type: "error", error }` if the pipeline fails.
 */
function createExtractionStream(url: string, minSize: number): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: ExtractionStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const images = await scrapeImages(url, {
          onProgress: (progress) => emit({ type: "progress", progress }),
        });
        const threshold = typeof minSize === "number" && minSize > 0 ? minSize : DEFAULT_MIN_SIZE;

        const seen = new Set<string>();
        const filteredImages = images.filter((image) => {
          if (image.width < threshold || image.height < threshold) return false;
          if (seen.has(image.sourceUrl)) return false;
          seen.add(image.sourceUrl);
          return true;
        });

        const result: ExtractionResult = {
          success: true,
          targetUrl: url,
          count: filteredImages.length,
          images: filteredImages,
        };

        emit({ type: "result", result });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to extract images";
        emit({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(request: Request) {
  let payload: { url?: string; minSize?: number } = {};

  try {
    payload = (await request.json()) as { url?: string; minSize?: number };
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, minSize } = payload;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ success: false, error: "A valid 'url' is required" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid URL format" }, { status: 400 });
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return NextResponse.json({ success: false, error: "URL must use http or https" }, { status: 400 });
  }

  const threshold = typeof minSize === "number" && minSize > 0 ? minSize : DEFAULT_MIN_SIZE;

  const stream = createExtractionStream(url, threshold);

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
