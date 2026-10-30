/**
 * Shared TypeScript types for the Universal High-Resolution Image Extractor & Downloader.
 */

/** A single image candidate extracted from a scraped page. */
export interface ImageCandidate {
  id: string;
  sourceUrl: string;
  thumbnailUrl?: string;
  detailUrl?: string;
  width: number;
  height: number;
  alt?: string;
}

/** High-level phases of the extraction pipeline. */
export enum ExtractionStage {
  Connecting = "connecting",
  LazyLoading = "lazy-loading",
  Analyzing = "analyzing",
  Ready = "ready",
}

export type ExtractionStatus = "idle" | "in-progress" | "complete" | "error";

/** Progress snapshot surfaced by the extraction pipeline. */
export interface ExtractionProgressState {
  stage: ExtractionStage;
  status: ExtractionStatus;
  message: string;
}

/** Response payload returned by the extraction endpoint. */
export interface ExtractionResult {
  success: boolean;
  targetUrl: string;
  count: number;
  images: ImageCandidate[];
}

/**
 * Events streamed by `POST /api/extract` as the pipeline progresses.
 * The final event is either `result` or `error`.
 */
export type ExtractionStreamEvent =
  | { type: "progress"; progress: ExtractionProgressState }
  | { type: "result"; result: ExtractionResult }
  | { type: "error"; error: string };
