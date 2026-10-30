import { NextResponse } from "next/server";
import { scrapeImages } from "@/lib/scraper";
import type { ExtractionResult } from "@/lib/types";

const DEFAULT_MIN_SIZE = 150;

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

  try {
    const images = await scrapeImages(url);
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

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract images";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
