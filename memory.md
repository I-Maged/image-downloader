# Memory — Universal High-Resolution Image Extractor & Downloader

Last updated: Fri Oct 30, 2026

## What was built

- **Step 2 of implementation plan completed:** Core Resolution Utilities.
  - Created `lib/types.ts` — `ImageCandidate`, `ExtractionStage` enum, `ExtractionStatus`, `ExtractionProgressState` (stage + status + message), `ExtractionResult`.
  - Created `lib/image-resolver.ts` — async `resolveSrcset`, async `normalizeImageUrl` (strips CDN downscale params/transforms, q=100 for Unsplash), `isDetailPageUrl`, async `resolveMasterAsset` (OG/Twitter/JSON-LD).
  - Created `lib/scraper.ts` — single entry point `scrapeImages(targetUrl): Promise<ImageCandidate[]>` (Playwright Chromium launch/context/scroll/extract/close).
- **Step 1 completed:** Install Dependencies — `@playwright/test@1.64.1`, `archiver@8.0.0`, `lucide-react@1.64.0` (deps); `@types/archiver@8.0.0` (dev); Chromium 156.0.8078.4 installed; headless launch smoke test passed; `npm ls` clean, 0 vulnerabilities.

## Decisions made

- Accepted latest semver ranges as-is for newly installed packages.
- Replaced plain `playwright` with `@playwright/test` (library + CLI + test runner).
- Future tests to live in `tests/` folder.
- Step 2 design decisions: async resolver functions; enum-based `ExtractionStage` + `ExtractionStatus` + message; single scraper entry point (`scrapeImages`); types-first module order (types → resolver → scraper).

## Problems solved

- None significant this session. Minor: Windows bash backslash path escaping caused a false `ls` failure; headless Chromium launch verified working via smoke test.

## Current state

- `npx tsc --noEmit` passes cleanly (strict mode).
- `implementation_plan.md` updated: **Step 1** and **Step 2** checked off as done (Steps 3–5 remain open).
- Repo baseline: Next.js 16.4.3, React 19.3, TypeScript 5, Tailwind v4 scaffold.
- `app/` contains only `favicon.ico`, `globals.css`, `layout.tsx`, `page.tsx` (no `api/`, `components/`, `lib/` before Step 2 created `lib/`).
- `next.config.ts` has `cacheComponents: true`, `partialPrefetching: true`, Turbopack CSS rule.

## Next session starts with

- **Step 3: Server API Endpoints** — implement `app/api/extract/route.ts` (input validation, scraping, filtering, dedup, error handling) and `app/api/download/route.ts` (single proxy + streaming ZIP via archiver).

## Open questions

- Whether `@playwright/test` should later move from `dependencies` to `devDependencies`.
- Next.js 16 breaking changes to be aware of (docs at `node_modules/next/dist/docs/`).
