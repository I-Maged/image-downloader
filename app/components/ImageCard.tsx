"use client";

import { Download, Maximize2 } from "lucide-react";
import type { ImageCandidate } from "@/lib/types";

interface ImageCardProps {
  image: ImageCandidate;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onPreview: (image: ImageCandidate) => void;
  onDownload: (image: ImageCandidate) => void;
}

export function ImageCard({ image, selected, onToggleSelect, onPreview, onDownload }: ImageCardProps) {
  const imageSrc = image.thumbnailUrl ?? image.sourceUrl;

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border bg-surface shadow-sm ${
        selected ? "border-accent ring-2 ring-accent" : "border-border"
      }`}
    >
      <img
        src={imageSrc}
        alt={image.alt ?? "Extracted high-resolution image"}
        loading="lazy"
        decoding="async"
        width={image.width}
        height={image.height}
        className="block h-auto w-full object-cover"
      />

      <button
        type="button"
        onClick={() => onToggleSelect(image.id)}
        aria-pressed={selected}
        aria-label={selected ? `Deselect image ${image.id}` : `Select image ${image.id}`}
        className={`absolute top-2 left-2 rounded-full p-2 transition ${
          selected ? "bg-accent text-accent-foreground" : "bg-black/60 text-white hover:bg-accent"
        }`}
      >
        <span className="flex h-4 w-4 items-center justify-center">
          {selected ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <span className="h-4 w-4 rounded-[2px] border-2 border-current" />
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onPreview(image)}
        aria-label="Preview full-resolution image"
        className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-white transition hover:bg-accent"
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
        {image.width} × {image.height}
      </span>

      <button
        type="button"
        onClick={() => onDownload(image)}
        aria-label="Download full-resolution image"
        className="absolute bottom-2 right-2 rounded-full bg-black/60 p-2 text-white transition hover:bg-accent"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}
