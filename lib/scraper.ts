/**
 * Headless browser management & scraping for the Universal High-Resolution
 * Image Extractor & Downloader.
 */

import { chromium } from "@playwright/test";
import { isDetailPageUrl, normalizeImageUrl, resolveSrcset } from "./image-resolver";
import type { ImageCandidate } from "./types";

const VIEWPORT = { width: 1920, height: 1080 };
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const INITIAL_RENDER_WAIT_MS = 2000;
const MAX_SCROLLS = 5;
const SCROLL_STEP_PX = 800;
const SCROLL_DELAY_MS = 150;

interface RawExtractedImage {
  src?: string;
  srcSet?: string;
  alt?: string;
  width?: number;
  height?: number;
  detailHref?: string;
}

/**
 * Single entry point: scrape a page and return its image candidates
 * resolved to the highest available source quality.
 */
export async function scrapeImages(targetUrl: string): Promise<ImageCandidate[]> {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      userAgent: USER_AGENT,
    });
    const page = await context.newPage();

    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(INITIAL_RENDER_WAIT_MS);

    // Progressive auto-scroll to trigger lazy-loaded images.
    for (let scroll = 1; scroll <= MAX_SCROLLS; scroll += 1) {
      await page.evaluate((y) => window.scrollTo(0, y), scroll * SCROLL_STEP_PX);
      await page.waitForTimeout(SCROLL_DELAY_MS);
    }

    const rawImages = (await page.evaluate((): RawExtractedImage[] => {
      const results: RawExtractedImage[] = [];

      const imgs = Array.from(document.querySelectorAll("img"));
      for (const img of imgs) {
        const src =
          img.currentSrc ||
          img.src ||
          (img.getAttribute("data-src") as string) ||
          (img.getAttribute("data-original") as string) ||
          (img.getAttribute("data-zoom-image") as string) ||
          "";
        const srcSet = img.getAttribute("srcset") ?? undefined;
        const anchor = img.closest("a") as HTMLAnchorElement | null;

        results.push({
          src,
          srcSet,
          alt: img.alt ?? undefined,
          width: img.naturalWidth,
          height: img.naturalHeight,
          detailHref: anchor ? anchor.href : undefined,
        });
      }

      return results;
    })) as RawExtractedImage[];

    const images: ImageCandidate[] = [];

    for (const [index, raw] of rawImages.entries()) {
      const candidates = await resolveSrcset(raw.srcSet);
      const sourceUrl = candidates[0] ?? raw.src ?? "";

      if (!sourceUrl) continue;

      const normalized = await normalizeImageUrl(sourceUrl);

      images.push({
        id: `img-${index}`,
        sourceUrl: normalized,
        thumbnailUrl: raw.src || undefined,
        detailUrl: raw.detailHref && isDetailPageUrl(raw.detailHref) ? raw.detailHref : undefined,
        width: raw.width ?? 0,
        height: raw.height ?? 0,
        alt: raw.alt,
      });
    }

    return images;
  } finally {
    await browser.close();
  }
}
