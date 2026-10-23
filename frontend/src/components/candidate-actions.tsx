"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import { api, type Job } from "@/lib/api";

/**
 * Bookmark and Shortlist on a candidate's profile.
 *
 * Both were buttons with nothing behind them — the models existed but no
 * view ever wrote to them, so pressing either did nothing.
 *
 * A bookmark is personal to the manager. A shortlist belongs to a posting
 * and the whole hiring team sees it, which is why shortlisting asks which
 * position rather than guessing.
 */

export function CandidateActions({
  candidateId,
  initialBookmarked,
  shortlistedJobIds,
  jobs,
}: {
  candidateId: number;
  initialBookmarked: boolean;
  shortlistedJobIds: number[];
  /** The manager's open postings, to shortlist against. */
  jobs: Pick<Job, "id" | "title">[];
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [shortlisted, setShortlisted] = useState(new Set(shortlistedJobIds));
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function toggleBookmark() {
    setBusy(true);
    setError(null);
    const result = await api.bookmarkCandidate(candidateId);
    setBusy(false);
    if (result.ok) {
      setBookmarked(result.data.bookmarked);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function toggleShortlist(jobId: number) {
    setBusy(true);
    setError(null);
    const result = await api.shortlistCandidate(candidateId, jobId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShortlisted((current) => {
      const next = new Set(current);
      if (result.data.shortlisted) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void toggleBookmark()}
          disabled={busy}
          aria-pressed={bookmarked}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60",
            bookmarked
              ? "border-brand-700 bg-brand-50 text-brand-700"
              : "border-line-strong bg-card text-ink hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
          )}
        >
          <Icon name="bookmark" className="size-3.5" />
          {bookmarked ? "Bookmarked" : "Bookmark"}
        </button>

        <div ref={box} className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            disabled={busy || jobs.length === 0}
            aria-haspopup="listbox"
            aria-expanded={open}
            title={
              jobs.length === 0
                ? "Post a job first — a shortlist belongs to a position"
                : undefined
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-800 disabled:opacity-60"
          >
            {shortlisted.size > 0
              ? `Shortlisted (${shortlisted.size})`
              : "Shortlist"}
            <Icon
              name="chevron-down"
              className={cn("size-3.5 transition-transform", open && "rotate-180")}
            />
          </button>

          {open ? (
            <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
              <p className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
                Shortlist for which position?
              </p>
              <ul className="max-h-72 overflow-y-auto p-1.5">
                {jobs.map((job) => {
                  const on = shortlisted.has(job.id);
                  return (
                    <li key={job.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={on}
                        disabled={busy}
                        onClick={() => void toggleShortlist(job.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-60",
                          on
                            ? "bg-brand-50 font-medium text-brand-700"
                            : "text-ink hover:bg-card-muted",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-4 shrink-0 place-items-center rounded border",
                            on
                              ? "border-brand-700 bg-brand-700 text-white"
                              : "border-line-strong",
                          )}
                        >
                          {on ? <Icon name="check" className="size-3" /> : null}
                        </span>
                        <span className="flex-1 truncate">{job.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-status-rose">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Save on its own, for the candidate pane beside a position's applicant
 * list.
 *
 * The same personal bookmark as the one on a candidate's profile, without
 * the shortlist picker beside it: on that screen a manager is scanning
 * candidates for one posting, and "which position?" is already answered.
 */
export function CandidateBookmarkButton({
  candidateId,
  initialSaved = false,
}: {
  candidateId: number;
  initialSaved?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const result = await api.bookmarkCandidate(candidateId);
    setBusy(false);
    if (result.ok) {
      setSaved(result.data.bookmarked);
      // The Saved tab and the saved-applicants count both read from the
      // server, so refresh rather than guessing at them here.
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-60",
        saved
          ? "border-brand-200 bg-brand-50 text-brand-700"
          : "border-line-strong bg-card text-ink hover:bg-card-muted",
      )}
    >
      <Icon
        name="bookmark"
        className={cn("size-3.5", saved && "fill-current")}
      />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
