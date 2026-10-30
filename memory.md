# Memory — Universal High-Resolution Image Extractor & Downloader

Last updated: Fri Oct 30, 2026

## What was built

- **Step 1 completed:** Install Dependencies — `@playwright/test@1.64.1`, `archiver@8.0.0`, `lucide-react@1.64.0` (deps); `@types/archiver@8.0.0` (dev); Chromium 156.0.8078.4 installed; headless launch smoke test passed; `npm ls` clean, 0 vulnerabilities.
- **Step 2 completed:** Core Resolution Utilities — created `lib/types.ts`, `lib/image-resolver.ts`, `lib/scraper.ts` (single entry point `scrapeImages`).
- **Step 3 completed:** Server API Endpoints — created `app/api/extract/route.ts` (validate → scrape → filter by minSize 150px → dedup → return `ExtractionResult`) and `app/api/download/route.ts` (single stream via `new Response(response.body, ...)`; multi → `ZipArchive` + pipe/finalize/collect → ZIP via `ReadableStream`).

## Decisions made

- Accepted latest semver ranges as-is for newly installed packages.
- Replaced plain `playwright` with `@playwright/test`.
- Future tests to live in `tests/` folder.
- Step 2 design decisions: async resolver functions; enum-based `ExtractionStage` + `ExtractionStatus` + message; single scraper entry point (`scrapeImages`).
- Step 3 notes: no `export const runtime = "nodejs"` on routes — incompatible with `nextConfig.cacheComponents: true` in this Next 16 version (build error); removed after initial build failure.

## Problems solved

- None significant this session. Minor: Windows bash backslash path escaping caused a false `ls` failure; headless Chromium launch verified via smoke test.

## Current state

- `npx tsc --noEmit` passes cleanly.
- `npm run build` succeeds; routes registered: `/` static, `/_not-found` static, `/api/download` dynamic, `/api/extract` dynamic.
- `implementation_plan.md`: Steps 1, 2, 3 checked off as done (Steps 4–5 remain open).
- Repo baseline: Next.js 16.4.3, React 19.3, TypeScript 5, Tailwind v4; `app/` had only favicon/globals/layout/page before API routes added; `next.config.ts` has `cacheComponents: true`, `partialPrefetching: true`, Turbopack CSS rule.

## Next session starts with

- **Step 4: Frontend UI Components** — build `UrlInputBar.tsx`, `ExtractionProgress.tsx`, `GalleryToolbar.tsx`, `ImageCard.tsx`, `ImageGrid.tsx`, `LightboxModal.tsx`, and wire to `/api/extract` + `/api/download`.

## Open questions

- Whether `@playwright/test` should later move from `dependencies` to `devDependencies`.
- Next.js 16 breaking changes to be aware of (docs at `node_modules/next/dist/docs/`).
- Step 4 frontend consumption of extraction progress/`ExtractionProgressState`.
