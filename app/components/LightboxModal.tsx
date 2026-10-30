"use client";

import { useEffect } from "react";
import { Download, X } from "lucide-react";
import type { ImageCandidate } from "@/lib/types";

interface LightboxModalProps {
  image: ImageCandidate | null;
  onClose: () => void;
  onDownload: (image: ImageCandidate) => void;
}

export function LightboxModal({ image, onClose, onDownload }: LightboxModalProps) {
  useEffect(() => {
    if (!image) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-overlay/80" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="High-resolution image preview"
        className="relative max-h-full w-full max-w-5xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white transition hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>

        <img
          src={image.sourceUrl}
          alt={image.alt ?? "Extracted high-resolution image"}
          className="max-h-[70vh] w-full rounded-lg object-contain"
        />

        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-text-primary">
              {image.width} × {image.height}
            </span>
            {image.detailUrl ? <span className="text-xs text-text-secondary">Source: {image.detailUrl}</span> : null}
          </div>

          <button
            type="button"
            onClick={() => onDownload(image)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 font-medium text-accent-foreground transition hover:bg-accent-dark"
          >
            <Download className="h-5 w-5" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
