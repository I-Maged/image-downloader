"use client";

import { useCallback, useMemo, useState } from "react";
import { Images } from "lucide-react";
import { UrlInputBar } from "./components/UrlInputBar";
import { ExtractionProgress } from "./components/ExtractionProgress";
import { GalleryToolbar } from "./components/GalleryToolbar";
import { ImageGrid } from "./components/ImageGrid";
import { LightboxModal } from "./components/LightboxModal";
import type {
  ExtractionProgressState,
  ExtractionResult,
  ExtractionStatus,
  ExtractionStreamEvent,
  ImageCandidate,
} from "@/lib/types";
import { ExtractionStage } from "@/lib/types";
const DEFAULT_MIN_SIZE = 150;

export default function Home() {
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [progress, setProgress] = useState<ExtractionProgressState>({
    stage: ExtractionStage.Connecting,
    status: "idle",
    message: "Waiting to start…",
  });
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hideSmall, setHideSmall] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageCandidate | null>(null);

  const images = useMemo(() => {
    const all = result?.images ?? [];
    if (!hideSmall) return all;
    return all.filter((image) => image.width >= DEFAULT_MIN_SIZE && image.height >= DEFAULT_MIN_SIZE);
  }, [result, hideSmall]);

  const selectedImages = useMemo(
    () => images.filter((image) => selectedIds.has(image.id)),
    [images, selectedIds],
  );

  const handleExtract = useCallback(async (url: string) => {
    setStatus("in-progress");
    setError(null);
    setResult(null);
    setSelectedIds(new Set());
    setDownloadError(null);
    setProgress({ stage: ExtractionStage.Connecting, status: "in-progress", message: "Connecting to page…" });

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, minSize: 0 }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start the extraction request.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      const handleEvent = (line: string) => {
        const event = JSON.parse(line) as ExtractionStreamEvent;
        if (event.type === "progress") {
          setProgress(event.progress);
          setStatus("in-progress");
        } else if (event.type === "result") {
          setResult(event.result);
          setStatus("complete");
          setSelectedIds(new Set());
        } else if (event.type === "error") {
          setError(event.error);
          setStatus("error");
        }
      };

      while (!finished) {
        const { done, value } = await reader.read();
        finished = done;

        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) handleEvent(line);
        }

        if (finished) {
          const tail = buffer.trim();
          if (tail) handleEvent(tail);
          buffer = "";
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract images.");
      setStatus("error");
    }
  }, []);

  const handleSubmitUrl = (url: string) => {
    void handleExtract(url);
  };

  const downloadImages = useCallback(async (imagesToDownload: ImageCandidate[]) => {
    if (imagesToDownload.length === 0) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: imagesToDownload.map((image) => ({
            id: image.id,
            sourceUrl: image.sourceUrl,
            detailUrl: image.detailUrl,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error ?? "Failed to download images.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const contentType = response.headers.get("content-type") ?? "";
      const filename =
        match?.[1] ??
        (contentType.includes("zip")
          ? `images-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`
          : `image-${Date.now()}.jpg`);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Failed to download images.");
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const handleDownloadSelected = useCallback(() => {
    void downloadImages(selectedImages);
  }, [downloadImages, selectedImages]);

  const handleDownloadImage = useCallback(
    (image: ImageCandidate) => {
      void downloadImages([image]);
    },
    [downloadImages],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (images.length === 0) return;
    setSelectedIds(new Set(images.map((image) => image.id)));
  }, [images]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewImage(null);
  }, []);

  const resetToIdle = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
    setSelectedIds(new Set());
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <Images className="h-5 w-5 text-accent-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-text-primary">High-Res Image Downloader</h1>
          </div>
          <p className="hidden text-sm text-text-secondary md:block">
            Extract images at their highest resolution and download them.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <section className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-text-primary sm:text-left">
            Paste a link. Get the highest-resolution originals.
          </h2>
          <UrlInputBar isLoading={status === "in-progress"} onSubmit={handleSubmitUrl} />
        </section>

        {status === "in-progress" ? <ExtractionProgress progress={progress} /> : null}

        {status === "error" ? (
          <div
            role="alert"
            className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-xl border border-error/40 bg-error/10 p-8 text-center"
          >
            <p className="text-lg font-semibold text-error">Extraction failed</p>
            <p className="text-sm text-text-secondary">{error}</p>
            <button
              type="button"
              onClick={resetToIdle}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 font-medium text-text-primary transition hover:border-accent hover:text-accent"
            >
              Try again
            </button>
          </div>
        ) : null}

        {status === "complete" ? (
          <section className="flex flex-col gap-6">
            <GalleryToolbar
              selectedCount={selectedImages.length}
              totalCount={images.length}
              hideSmall={hideSmall}
              onToggleHideSmall={() => setHideSmall((prev) => !prev)}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onDownload={handleDownloadSelected}
              isDownloading={isDownloading}
            />

            <ImageGrid
              images={images}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onPreview={setPreviewImage}
              onDownload={handleDownloadImage}
            />

            {downloadError ? (
              <p role="alert" className="text-sm text-error">
                {downloadError}
              </p>
            ) : null}
          </section>
        ) : null}
      </main>

      <LightboxModal image={previewImage} onClose={handleClosePreview} onDownload={handleDownloadImage} />
    </div>
  );
}
