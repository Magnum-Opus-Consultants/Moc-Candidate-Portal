"use client";

import { useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/**
 * The candidate's profile photo: the picture itself, and nothing else.
 *
 * Clicking it opens the file picker; a small cross on the corner removes
 * it. The explanatory paragraph that used to sit beside it said what the
 * picker already says, so it was a line of text earning nothing.
 *
 * It saves immediately rather than waiting for the form's Save — a photo is
 * a file, not a field, and there is nothing to review before keeping it.
 * The server squares, downscales and re-encodes whatever is sent, so a
 * sideways 6 MB phone photo comes back as a 512px JPEG with its EXIF — and
 * the GPS position in it — gone.
 */

const ACCEPT = "image/jpeg,image/png,image/webp";

export function PhotoUpload({
  url,
  initials,
}: {
  url: string;
  /** Shown until there is a photo. */
  initials: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);

    const result = await api.uploadPhoto(file);
    setBusy(false);

    if (result.ok) {
      // The filename never changes, so the browser would keep showing the
      // old photo without something to bust its cache.
      setPhoto(`${result.data.photo_url}?v=${Date.now()}`);
    } else {
      setError(result.error);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await api.removePhoto();
    setBusy(false);
    if (result.ok) setPhoto("");
    else setError(result.error);
  }

  return (
    <div>
      <div className="relative w-fit">
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            // Let the same file be chosen again after a mistake.
            e.target.value = "";
          }}
        />

        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          title={photo ? "Change your profile photo" : "Add a profile photo"}
          className={cn(
            "group relative grid size-20 place-items-center overflow-hidden rounded-full transition-colors",
            photo
              ? "bg-card-muted"
              : "border border-dashed border-line-strong bg-card-muted text-base font-semibold text-ink-muted hover:border-brand-400 hover:text-brand-700",
            busy && "opacity-60",
          )}
        >
          <span className="sr-only">
            {photo ? "Change your profile photo" : "Add a profile photo"}
          </span>

          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span aria-hidden>{initials}</span>
          )}

          {/* The camera only appears over the picture, on hover. */}
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 grid place-items-center bg-ink-strong/55 text-white opacity-0 transition-opacity",
              !busy && "group-hover:opacity-100 group-focus-visible:opacity-100",
            )}
          >
            <Icon name={photo ? "refresh" : "plus"} className="size-5" />
          </span>
        </button>

        {photo && !busy ? (
          <button
            type="button"
            onClick={() => void remove()}
            title="Remove your profile photo"
            className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full border border-line bg-card text-ink-muted shadow-sm transition-colors hover:border-status-rose hover:text-status-rose"
          >
            <Icon name="close" className="size-3.5" />
            <span className="sr-only">Remove your profile photo</span>
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-status-rose">
          {error}
        </p>
      ) : null}
    </div>
  );
}
