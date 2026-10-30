"use client";

import { Download, Loader2 } from "lucide-react";

interface GalleryToolbarProps {
  selectedCount: number;
  totalCount: number;
  hideSmall: boolean;
  onToggleHideSmall: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDownload: () => void;
  isDownloading: boolean;
}

export function GalleryToolbar({
  selectedCount,
  totalCount,
  hideSmall,
  onToggleHideSmall,
  onSelectAll,
  onDeselectAll,
  onDownload,
  isDownloading,
}: GalleryToolbarProps) {
  const hasImages = totalCount > 0;

  return (
    <div className="sticky top-0 z-10 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-text-primary">
            {selectedCount} of {totalCount} selected
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              disabled={!hasImages}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onDeselectAll}
              disabled={selectedCount === 0}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Deselect All
            </button>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={hideSmall}
              onChange={onToggleHideSmall}
              className="h-4 w-4 rounded border-border text-accent focus:ring-2 focus:ring-accent/30"
            />
            Hide small images (&lt; 150px)
          </label>
        </div>

        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading || selectedCount === 0}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 font-medium text-accent-foreground transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          {isDownloading
            ? "Preparing…"
            : selectedCount === 1
              ? "Download 1 Image"
              : `Download ZIP (${selectedCount} Images)`}
        </button>
      </div>
    </div>
  );
}
