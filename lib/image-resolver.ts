/**
 * High-resolution image resolution utilities.
 *
 * - Resolves responsive `srcset` definitions to the highest-quality candidate(s).
 * - Normalizes CDN downscaling parameters / transforms (Unsplash, Cloudinary, Imgix, etc.).
 * - Resolves on-demand master assets from detail pages (e.g. Unsplash photo pages).
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Parse a `srcset` attribute into candidate image URLs.
 * Returns unique candidate URLs sorted by descending resolution.
 */
export async function resolveSrcset(srcset: string | null | undefined): Promise<string[]> {
  if (!srcset) {
    return [];
  }

  const candidates: Array<{ url: string; score: number }> = [];

  for (const part of srcset.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const [rawUrl, descriptor] = trimmed.split(/\s+/);
    if (!rawUrl) continue;

    candidates.push({ url: rawUrl, score: descriptor ? descriptorScore(descriptor) : 0 });
  }

  candidates.sort((a, b) => b.score - a.score);

  const resolved: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const key = candidate.url.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push(candidate.url);
  }

  return resolved;
}

function descriptorScore(descriptor: string | undefined): number {
  if (!descriptor) return 0;
  const match = descriptor.match(/^(\d+)(w|x)$/i);
  if (!match) return 0;
  return Number(match[1]);
}

/**
 * Normalize a raw image URL:
 * - Strip CDN downscaling query params (w, width, h, height, fit, dpr, fm).
 * - Strip path-based resize segments (e.g. `/w_300,h_200/`).
 * - For Unsplash, enforce maximum quality (`q=100`).
 */
export async function normalizeImageUrl(rawUrl: string): Promise<string> {
  let url = (rawUrl ?? "").trim();
  if (!url) return url;

  if (/images\.unsplash\.com/i.test(url)) {
    const unsplash = new URL(url);
    unsplash.searchParams.delete("w");
    unsplash.searchParams.delete("h");
    unsplash.searchParams.delete("fit");
    unsplash.searchParams.set("q", "100");
    url = unsplash.toString();
  }

  try {
    const parsed = new URL(url);
    for (const key of ["w", "width", "h", "height", "fit", "dpr", "fm"]) {
      parsed.searchParams.delete(key);
    }
    url = parsed.toString();
  } catch {
    // Not an absolute URL — leave it untouched.
  }

  // Strip path-based resize segments, e.g. "/w_400,h_300/".
  url = url.replace(/\/[a-z][a-z0-9]*_\d+(?:,[a-z][a-z0-9]*_\d+)*/gi, "");

  // Clean WordPress dimension suffixes, e.g. image-150x150.jpg -> image.jpg.
  url = url.replace(/-\d+x\d+(?=\.[a-zA-Z]{3,4}(?:[?#].*)?$)/, "");

  return url;
}

/**
 * Detect whether a URL points to a detail page that may host a higher-resolution
 * master asset (e.g. Unsplash photo pages like /photos/[slug]).
 */
export function isDetailPageUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  const normalized = url.split("?")[0];
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, "");
    const isUnsplashPhoto = host === "unsplash.com" && /^\/photos\/[^/]+/i.test(parsed.pathname);
    const isGenericPhotoPage = /\/photos\//i.test(normalized);
    return isUnsplashPhoto || isGenericPhotoPage;
  } catch {
    return /\/photos\//i.test(normalized);
  }
}

function metaContent(html: string, key: string): string | undefined {
  const metaTagRegex = /<meta\s+[^>]*>/gi;
  for (const match of html.matchAll(metaTagRegex)) {
    const tag = match[0];
    const attributeMatch = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i);
    if (!attributeMatch || attributeMatch[1].toLowerCase() !== key.toLowerCase()) continue;

    const contentMatch = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (contentMatch?.[1]) return contentMatch[1];
  }

  return undefined;
}

/**
 * On-demand resolution of a master asset from a detail page
 * (OpenGraph / Twitter meta tags / JSON-LD structured data).
 */
export async function resolveMasterAsset(detailUrl: string): Promise<string | undefined> {
  try {
    const response = await fetch(detailUrl, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    if (!response.ok) return undefined;

    const html = await response.text();

    const ogImage = metaContent(html, "og:image");
    const twitterImage = metaContent(html, "twitter:image");
    const jsonLd = html.match(/["']contentUrl["']\s*:\s*["']([^"']+)["']/);

    const rawImage = ogImage ?? twitterImage ?? jsonLd?.[1];
    if (!rawImage) return undefined;

    const resolved = new URL(rawImage, detailUrl).toString();
    return normalizeImageUrl(resolved);
  } catch {
    return undefined;
  }
}
