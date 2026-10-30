"use client";

import { ImageOff } from "lucide-react";
import { ImageCard } from "./ImageCard";
import type { ImageCandidate } from "@/lib/types";

interface ImageGridProps {
  images: ImageCandidate[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onPreview: (image: ImageCandidate) => void;
  onDownload: (image: ImageCandidate) => void;
}

export function ImageGrid({ images, selectedIds, onToggleSelect, onPreview, onDownload }: ImageGridProps) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
        <ImageOff className="h-10 w-10 text-text-muted" />
        <p className="text-base font-medium text-text-primary">No images found</p>
        <p className="max-w-md text-sm text-text-secondary">
          We couldn&apos;t find any downloadable images on this page. Try another URL.
        </p>
      </div>
    );
  }

  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
      {images.map((image) => (
        <div key={image.id} className="mb-4 break-inside-avoid">
          <ImageCard
            image={image}
            selected={selectedIds.has(image.id)}
            onToggleSelect={onToggleSelect}
            onPreview={onPreview}
            onDownload={onDownload}
          />
        </div>
      ))}
    </div>
  );
}
