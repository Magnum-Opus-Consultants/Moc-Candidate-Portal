"use client";

import { useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/**
 * Fill the profile in from the candidate's existing CV.
 *
 * This is the real autofill. LinkedIn's public API returns a name, an email
 * and a picture and nothing else, so work history, education and skills have
 * to be read from the document the candidate already has.
 *
 * What comes back is applied as *unsaved* edits, never written straight to
 * the profile: a CV is free-form prose and the parse is a good first draft,
 * so the candidate reads it over and presses Save themselves.
 */

const ACCEPT = ".pdf,.docx,.txt";

export function CvUpload({
  onSuggestions,
}: {
  /** Field name -> value, in the shape the profile form's draft holds. */
  onSuggestions: (suggestions: Record<string, unknown>) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filled, setFilled] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setFilled(null);

    const result = await api.uploadCv(file);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const { suggestions } = result.data;
    const count = Object.keys(suggestions).length;
    if (count === 0) {
      setError(
        "Nothing could be read from that CV. Fill the form in below instead.",
      );
      return;
    }

    onSuggestions(suggestions);
    setFilled(count);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handle(e.dataTransfer.files[0]);
      }}
      className={cn(
        "rounded-xl border border-dashed p-5 transition-colors",
        dragging ? "border-brand-500 bg-brand-50" : "border-line-strong bg-card",
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <Icon name="file" className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-strong">
            Upload your CV to fill this in
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            PDF, .docx or .txt. We read your work history, education and skills
            and fill the form below — check it over before you save.
          </p>
        </div>

        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            void handle(e.target.files?.[0]);
            // Let the same file be picked again after a correction.
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="shrink-0 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-800 disabled:opacity-60"
        >
          {busy ? "Reading your CV…" : "Choose file"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-status-rose">
          {error}
        </p>
      ) : null}

      {filled !== null ? (
        <p role="status" className="mt-3 text-sm font-medium text-status-green">
          Filled in {filled} {filled === 1 ? "field" : "fields"} from your CV —
          check them below, then save.
        </p>
      ) : null}
    </div>
  );
}
