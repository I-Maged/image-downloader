"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Search, X } from "lucide-react";

interface UrlInputBarProps {
  isLoading: boolean;
  onSubmit: (url: string) => void;
}

const PRESET_URLS = [
  { label: "Unsplash", url: "https://unsplash.com/" },
  { label: "Picsum Photo", url: "https://picsum.photos/seed/mountain-view/1280/800" },
];

export function UrlInputBar({ isLoading, onSubmit }: UrlInputBarProps) {
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      setValidationError("Please paste a webpage URL to extract images from.");
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      setValidationError("That doesn't look like a valid URL.");
      return;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      setValidationError("URL must start with http:// or https://");
      return;
    }

    setValidationError(null);
    onSubmit(trimmed);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(value);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <input
            type="url"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Paste a webpage URL… e.g. https://unsplash.com"
            className="w-full rounded-full border border-border bg-surface py-3 pr-12 pl-12 text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            aria-label="Webpage URL"
          />
          {value.length > 0 && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setValidationError(null);
              }}
              aria-label="Clear URL"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-text-muted transition hover:bg-surface-tertiary hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-6 font-medium text-accent-foreground transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          {isLoading ? "Extracting…" : "Extract Images"}
        </button>
      </form>

      {validationError ? (
        <p className="mt-2 text-sm text-error">{validationError}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-secondary">Try:</span>
        {PRESET_URLS.map((preset) => (
          <button
            key={preset.url}
            type="button"
            onClick={() => submit(preset.url)}
            disabled={isLoading}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
