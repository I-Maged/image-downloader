# Implementation Plan: Universal High-Resolution Image Extractor & Downloader

## 1. Project Overview & Objectives

A Next.js (App Router) web application that accepts any webpage URL, extracts all embedded and lazy-loaded images, and allows users to preview, select, and batch-download the **original source images at their highest available resolution** (not low-res thumbnails or display-scaled versions).

### Key Highlights
- **Universal Dynamic Scraping**: Uses a headless browser (Playwright Chromium) in a Node.js server runtime to render JavaScript-heavy single-page applications (like Unsplash, Pinterest, React portfolios) and auto-scroll to trigger lazy-loaded assets.
- **Smart Source Resolution Engine**:
  - Automatically parses responsive `srcset` definitions to grab the maximum width/density candidate.
  - Normalizes and strips CDN downscaling parameters (e.g., Unsplash, Imgix, Cloudinary, WordPress thumbnail suffixes).
  - Detects thumbnails wrapped in detail links (e.g. `unsplash.com/photos/[slug]`) and performs on-demand deep resolution to extract the full master asset (e.g. 1946 × 2455).
- **Streamlined Download UX**:
  - Single image: Direct browser download with correct sanitized filename and original format.
  - Multi-image selection: On-the-fly streaming `.zip` archive via the backend proxy (bypassing CORS, anti-hotlinking referer restrictions, and browser multi-download blockers).
- **Filtering & Interface**:
  - Filter out tiny UI elements, icons, and tracking pixels (< 150px) by default with toggleable controls.
  - Clear multi-stage extraction progress status.
  - Gallery cards with dimension badges, quick lightbox preview, individual download buttons, and a sticky selection toolbar.

---

## 2. Technology Stack & Dependencies

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | Full-stack React 19 framework with API route handlers |
| **Language** | TypeScript 5 | Strict type safety for image metadata and scrape models |
| **Styling** | Tailwind CSS v4 | Clean, modern responsive interface |
| **Browser Automation** | `playwright` (Chromium) | Headless browser for dynamic DOM execution, lazy loading, and deep page inspection |
| **Archive Streaming** | `archiver` + `@types/archiver` | Streams ZIP archives directly to HTTP response without disk bottlenecks |
| **Icons** | `lucide-react` | UI icons for selection, downloads, loading, and dimensions |

---

## 3. High-Resolution Extraction & Resolution Architecture

```
                                  [ User Input: URL ]
                                           │
                                           ▼
                                [ POST /api/extract ]
                                           │
                ┌──────────────────────────┴──────────────────────────┐
                │                                                     │
       [ Playwright Headless ]                               [ Scraper Heuristics ]
    - Spoof Desktop User-Agent                           - Extract `img[src]`, `picture source`
    - Wait for network idle                              - Parse `srcset` (highest `w`/`x`)
    - Smooth auto-scroll (lazy load)                     - Check parent `<a href="...">`
    - Read natural & rendered dimensions                 - Read `data-original`, `data-full`
                │                                                     │
                └──────────────────────────┬──────────────────────────┘
                                           │
                                           ▼
                        [ Image Metadata Deduplication & Filter ]
                               - Filter out < 150px (icons/spacers)
                               - Strip CDN downscaling queries
                               - Preserve detail link for on-demand resolve
                                           │
                                           ▼
                          [ Frontend Gallery Presentation ]
                       - Checkboxes for multi-selection
                       - Dimension badges & Lightbox preview
                       - "Select All" / "Download Selected"
                                           │
                                           ▼
                                [ POST /api/download ]
                                           │
                ┌──────────────────────────┴──────────────────────────┐
                │ Single Image Selection                              │ Multi-Image Selection
                ▼                                                     ▼
     Direct Stream Proxy                                     Streaming ZIP Archive
   - On-demand detail resolve (if needed)                  - Resolve sources in parallel
   - Fetch master buffer / stream                          - Stream each entry into `archiver`
   - Content-Disposition: attachment                       - Output single .zip to client
```

---

## 4. File Structure & Component Map

```
downloader/
├── app/
│   ├── api/
│   │   ├── extract/
│   │   │   └── route.ts             # POST: Launches Playwright, scrolls, extracts image candidates
│   │   └── download/
│   │       └── route.ts             # POST: Proxies single image or streams dynamic ZIP archive
│   ├── components/
│   │   ├── UrlInputBar.tsx          # URL input form with validation and preset samples
│   │   ├── ExtractionProgress.tsx   # Step-by-step extraction progress indicator
│   │   ├── GalleryToolbar.tsx       # Selection counts, Select All, filter toggles, Download action
│   │   ├── ImageCard.tsx            # Card with thumbnail, dimension badge, checkbox, single download
│   │   ├── ImageGrid.tsx            # Responsive masonry / flex grid of image cards
│   │   └── LightboxModal.tsx        # High-res preview lightbox
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                     # Main client dashboard orchestrating extraction & selection
├── lib/
│   ├── scraper.ts                   # Headless browser management (Playwright lifecycle, page scroll)
│   ├── image-resolver.ts            # Srcset parsing, CDN query normalization, detail-page scraper
│   └── types.ts                     # Shared TypeScript interfaces for ImageCandidate, ExtractResponse
├── package.json
└── tsconfig.json
```

---

## 5. Detailed Module Specifications

### Module 1: Browser Management & Scraping (`lib/scraper.ts`)
1. **Browser Pooling**:
   - Maintain a shared Chromium instance or lightweight browser context manager with auto-close idle timer (e.g., 60 seconds of inactivity) to avoid launching a heavy browser process on every single request.
2. **Page Navigation & Emulation**:
   - Standard 1920x1080 viewport with realistic `User-Agent` header to prevent basic anti-bot blocks.
   - Navigate with `waitUntil: 'domcontentloaded'`, then wait up to 2 seconds for initial dynamic renders.
3. **Auto-Scroll for Lazy Loading**:
   - Execute progressive scroll steps (`window.scrollBy(0, 800)`) with short delays (100–200ms) to trigger `IntersectionObserver` callbacks and lazy-loading image tags.
4. **DOM Extraction Script**:
   - Collects all:
     - `<img>` tags (`src`, `srcset`, `currentSrc`, `data-src`, `data-original`, `data-zoom-image`, `alt`, natural dimensions).
     - `<picture>` / `<source>` tags.
     - Parent `<a>` elements wrapping images (capturing `href` which often points to detail pages or raw files).
     - CSS `background-image` urls where applicable.

### Module 2: High-Resolution Resolution Engine (`lib/image-resolver.ts`)
1. **Srcset Resolution**:
   - Parse comma-separated descriptors (e.g. `img.jpg 640w, img-hd.jpg 2455w`).
   - Extract candidate with the highest pixel descriptor (`w` or `x`).
2. **CDN Normalization**:
   - **Unsplash**: Detect `images.unsplash.com`. Strip parameters restricting resolution (`w=...`, `h=...`, `fit=crop`) or replace with max quality parameters (`q=100`).
   - **Cloudinary / Imgix / Shopify**: Remove dynamic width transformation segments (`/w_300,h_200/`, `?width=...`).
   - **WordPress**: Clean regex dimension suffixes (e.g., `image-150x150.jpg` -> `image.jpg`).
3. **Detail Page Resolution (e.g. Unsplash Photos)**:
   - When a thumbnail's parent anchor points to an Unsplash photo page (e.g. `https://unsplash.com/photos/[slug]`):
     - Mark the item with `detailUrl`.
     - Implement `resolveMasterAsset(detailUrl)`: Scrapes the photo detail page for:
       - OpenGraph / Twitter meta tags (`og:image`, `twitter:image`).
       - JSON-LD structured data (`schema.org/ImageObject` `contentUrl`).
       - The highest-resolution download href from the page DOM.

### Module 3: Extraction Route (`app/api/extract/route.ts`)
- **Method**: `POST`
- **Body**: `{ url: string, minSize?: number }`
- **Process**:
  1. Validate URL format (http/https).
  2. Invoke `scrapeImages(url)`.
  3. Filter out items below `minSize` threshold (default 150px width/height).
  4. Deduplicate items by normalized image URL.
  5. Return JSON payload:
     ```typescript
     {
       success: true,
       targetUrl: string,
       count: number,
       images: ImageCandidate[]
     }
     ```

### Module 4: Download & ZIP Streaming Route (`app/api/download/route.ts`)
- **Method**: `POST`
- **Body**: `{ items: Array<{ id: string, sourceUrl: string, detailUrl?: string, filename?: string }> }`
- **Single Item Handling**:
  - Resolves source URL if needed.
  - Fetches original asset using server-side `fetch` with realistic `Referer` and `User-Agent` headers (bypasses CDN CORS and anti-hotlink 403 Forbidden).
  - Streams binary response with header `Content-Disposition: attachment; filename="sanitized-name.ext"`.
- **Multi-Item Handling**:
  - Initializes `archiver('zip', { zlib: { level: 6 } })`.
  - Sets response header `Content-Type: application/zip` and `Content-Disposition: attachment; filename="images-[timestamp].zip"`.
  - Concurrently fetches high-res images in small batches (3-5 parallel), piping each file into the archive with a deduplicated clean filename.
  - Streams the ZIP output directly to the HTTP response stream.

### Module 5: Frontend Interface (`app/page.tsx` & components)
1. **Header & Search Bar**:
   - Clean, modern search bar with URL input, clear button, and "Extract Images" button.
   - Quick-try sample buttons (e.g. Unsplash, Wallpaper/Photography blogs).
2. **Progress Status Banner**:
   - Displays clear transition states:
     - `1. Connecting to page...`
     - `2. Executing dynamic JavaScript & lazy-loading...`
     - `3. Analyzing high-resolution sources & metadata...`
     - `4. Ready!`
3. **Sticky Controls Toolbar**:
   - "Select All" / "Deselect All" buttons.
   - Counter: `3 of 24 selected`.
   - Dimension filter toggle: `Hide small icons (< 150px)` checkbox or toggle.
   - Action Button:
     - `Download 1 Image` (direct download).
     - `Download ZIP (N Images)` (batch ZIP download).
4. **Responsive Image Grid**:
   - Cards display:
     - Checkbox at top-left.
     - Dimension badge at bottom-left (`1946 × 2455`).
     - Magnifying glass icon to open the full Lightbox preview.
     - Direct single download icon button at bottom-right.
5. **Lightbox Modal**:
   - Allows users to preview the full high-res source image, inspect natural resolution, and trigger single download.

---

## 6. Edge Cases & Resilience Strategy

| Edge Case | Risk | Solution |
| :--- | :--- | :--- |
| **Strict Anti-Hotlinking / CORS** | Direct client downloads fail with 403 Forbidden or CORS error | All downloads route through server-side streaming proxy (`/api/download`) with spoofed `Referer` and `User-Agent`. |
| **Slow/Heavy Pages** | Scraping hangs indefinitely | Strict 30s timeout on Playwright page navigation with graceful fallback to whatever DOM nodes loaded. |
| **Infinite Scroll Sites** | Endless page expansion | Fixed scroll limit (e.g., maximum 5 progressive scrolls or 50 images per scan) to keep response times fast. |
| **Memory Exhaustion on Large ZIPs** | Creating large in-memory buffers crashes the Node process | Use Node.js streaming (`archiver` piped into web `ReadableStream`) to stream chunks directly to the client with negligible RAM footprint. |
| **Duplicate Images** | Same photo repeated in different display sizes | URL normalization and canonical ID hashing to ensure each source image only appears once. |

---

## 7. Step-by-Step Implementation Roadmap

- [ ] **Step 1: Install Dependencies**
  - Install `playwright`, `archiver`, `@types/archiver`, and `lucide-react`.
  - Run `npx playwright install chromium` to ensure headless browser binary is ready.
- [ ] **Step 2: Core Resolution Utilities**
  - Create `lib/types.ts` defining data models (`ImageCandidate`, `ExtractionProgressState`).
  - Create `lib/image-resolver.ts` with `srcset` parsing, CDN query clearing, and detail-link resolvers.
  - Create `lib/scraper.ts` with Playwright browser management, auto-scrolling, and DOM extraction.
- [ ] **Step 3: Server API Endpoints**
  - Implement `app/api/extract/route.ts` with input validation, scraping execution, and error handling.
  - Implement `app/api/download/route.ts` with single-file proxying and streaming multi-file ZIP generation.
- [ ] **Step 4: Frontend UI Components**
  - Build `UrlInputBar.tsx` with loading states.
  - Build `ExtractionProgress.tsx` displaying step-by-step progress.
  - Build `GalleryToolbar.tsx` with selection helpers and batch download button.
  - Build `ImageCard.tsx` and `ImageGrid.tsx` with selection checkboxes and dimension badges.
  - Build `LightboxModal.tsx` for full-screen inspection.
- [ ] **Step 5: End-to-End Testing & Verification**
  - Test with the user's Unsplash example (`https://unsplash.com/` and individual photo detail pages) to verify source resolution (e.g., 1946 × 2455).
  - Test on standard non-Unsplash websites (blogs, e-commerce, documentation) to verify universal compatibility.
  - Verify single download and multi-item ZIP archive creation.

