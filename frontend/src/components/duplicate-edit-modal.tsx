"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Checkbox } from "@/components/profile-form/fields";
import { Icon } from "@/components/ui/icon";
import { api, type Job } from "@/lib/api";

/**
 * "Duplicate this job to change locked details".
 *
 * The way out of the locked fields: rather than letting a manager edit a
 * live posting's title, company or requirements — which would invalidate
 * every match and application already made against them — this copies the
 * posting into a draft they can change freely and publish as a new job.
 *
 * The checkbox decides what happens to the original. Closing it when the
 * copy goes live is usually what is wanted: two near-identical postings on
 * the board is the failure this flow is trying to avoid. The existing
 * applicants stay on the original and keep their status either way, which
 * the design is careful to say out loud.
 */
export function DuplicateEditModal({
  job,
  open,
  onClose,
}: {
  job: Job;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [closeOriginal, setCloseOriginal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  async function duplicate() {
    setBusy(true);
    setError(null);

    const result = await api.duplicateJob(job.id);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    // The original is only closed once the copy is actually published, so
    // nothing is taken off the board on the strength of an intention. The
    // choice travels with the copy for the publish step to honour.
    const copy = result.data.job;
    onClose();
    router.push(
      `/manager/jobs/${copy.id}/edit${closeOriginal ? `?close_original=${job.id}` : ""}`,
    );
    router.refresh();
  }

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current && !busy) onClose();
      }}
      className="max-w-lg rounded-2xl border border-line bg-card p-0 text-ink backdrop:bg-black/40"
    >
      <div className="p-6">
        <span
          aria-hidden
          className="grid size-11 place-items-center rounded-lg bg-brand-50 text-brand-700"
        >
          <Icon name="copy" className="size-5" />
        </span>

        <h2 className="mt-4 text-lg font-semibold text-ink-strong">
          Duplicate this job to change locked details
        </h2>

        <p className="mt-2 text-sm leading-6 text-ink-muted">
          The job title, company, role category, work setup and candidate
          requirements can&rsquo;t change on a live job. We&rsquo;ll create a
          draft copy of &ldquo;{job.title}&rdquo; with everything filled in, so
          you can change what you need and publish it as a new job.
        </p>

        <div className="mt-4 rounded-lg border border-line bg-card-muted p-3">
          <Checkbox
            label={
              <span>
                <span className="font-medium text-ink">
                  Close the original job when the copy is published
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  The {job.applicant_count} existing{" "}
                  {job.applicant_count === 1 ? "applicant stays" : "applicants stay"}{" "}
                  on the original job and keep their status.
                </span>
              </span>
            }
            checked={closeOriginal}
            onChange={setCloseOriginal}
          />
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-xs text-status-rose">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <a
            href="/manager/jobs/new"
            className="text-sm font-medium text-ink-muted transition-colors hover:text-ink-strong"
          >
            Create new job instead
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-line-strong bg-card px-3.5 py-2 text-sm font-semibold text-ink shadow-xs transition-colors hover:bg-card-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={duplicate}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-secondary bg-brand-secondary px-3.5 py-2 text-sm font-semibold text-brand-secondary-ink shadow-xs transition-colors hover:border-brand-secondary-hover hover:bg-brand-secondary-hover disabled:opacity-60"
            >
              <Icon name="copy" className="size-4" />
              {busy ? "Duplicating…" : "Duplicate & edit"}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
