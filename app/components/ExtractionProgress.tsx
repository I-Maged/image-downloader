"use client";

import { Check, Loader2 } from "lucide-react";
import { type ExtractionProgressState, ExtractionStage } from "@/lib/types";

interface ExtractionProgressProps {
  progress: ExtractionProgressState;
}

const STAGES = [
  { stage: ExtractionStage.Connecting, label: "Connecting to page…" },
  { stage: ExtractionStage.LazyLoading, label: "Executing dynamic JavaScript & lazy-loading…" },
  { stage: ExtractionStage.Analyzing, label: "Analyzing high-resolution sources & metadata…" },
  { stage: ExtractionStage.Ready, label: "Ready!" },
];

export function ExtractionProgress({ progress }: ExtractionProgressProps) {
  const activeIndex = STAGES.findIndex((entry) => entry.stage === progress.stage);

  if (progress.status === "error") {
    return (
      <div
        role="alert"
        className="flex w-full max-w-xl flex-col items-center gap-4 rounded-xl border border-error/40 bg-error/10 p-8 text-center"
      >
        <p className="text-lg font-semibold text-error">Extraction failed</p>
        <p className="text-sm text-text-secondary">{progress.message}</p>
      </div>
    );
  }

  return (
    <ol className="flex w-full max-w-xl flex-col gap-4" aria-live="polite">
      {STAGES.map((entry, index) => {
        const isDone = progress.status === "complete" || index < activeIndex;
        const isActive = progress.status === "in-progress" && index === activeIndex;

        return (
          <li
            key={entry.stage}
            className={`flex items-center gap-3 rounded-lg border p-4 ${
              isActive
                ? "border-info/40 bg-info-lightest"
                : isDone
                  ? "border-success-lightest bg-success-lightest"
                  : "border-border bg-surface"
            }`}
          >
            {isDone ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                <Check className="h-4 w-4" />
              </span>
            ) : isActive ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info text-info-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-muted">
                {index + 1}
              </span>
            )}

            <span className={`text-sm font-medium ${isDone ? "text-success" : isActive ? "text-info" : "text-text-secondary"}`}>
              {entry.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
