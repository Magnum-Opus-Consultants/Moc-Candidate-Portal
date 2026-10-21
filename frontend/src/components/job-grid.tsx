"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { JobGridCard } from "@/components/job-cards";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import { api, type Job } from "@/lib/api";

/**
 * The jobs grid, with selection and deletion.
 *
 * Selection lives here rather than on the cards so one toolbar can speak for
 * all of them — "3 selected · Delete" is the whole point of multi-select, and
 * that needs a parent holding the set.
 *
 * Deleting always goes through the same confirm dialog, whether it is one
 * posting or twelve. A destructive action that happens on a single click is
 * one mis-click from losing work, and the inline "Delete? Yes/No" it replaces
 * was easy to hit by accident on a dense grid.
 */
export function JobGrid({ jobs, view }: { jobs: Job[]; view: "grid" | "list" }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<Job[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // A posting with applicants cannot be deleted — their applications are
  // kept — so it is not selectable either, rather than offered and refused.
  const deletable = jobs.filter((job) => job.applicant_count === 0);
  const allChosen =
    deletable.length > 0 && deletable.every((job) => selected.has(job.id));

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allChosen ? new Set() : new Set(deletable.map((job) => job.id)));
  }

  async function confirmDelete() {
    if (!pending) return;
    setBusy(true);
    setFailed(false);

    const result =
      pending.length === 1
        ? await api.deleteJob(pending[0].id)
        : await api.deleteJobs(pending.map((job) => job.id));

    setBusy(false);
    setPending(null);

    if (result.ok) {
      setSelected(new Set());
      setNote(result.data.detail);
      router.refresh();
      return;
    }
    if (result.status === 401 || result.status === 403) {
      router.push("/signin");
      return;
    }
    setFailed(true);
    setNote(result.error);
  }

  return (
    <>
      {deletable.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={allChosen}
              onChange={toggleAll}
              className="size-4 rounded border-line accent-brand-700"
            />
            Select all on this page
          </label>

          {selected.size > 0 ? (
            <>
              <span className="text-sm font-medium text-ink">
                {selected.size} selected
              </span>
              <button
                type="button"
                onClick={() =>
                  setPending(jobs.filter((job) => selected.has(job.id)))
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-status-rose/40 px-3 py-1.5 text-sm font-medium text-status-rose transition-colors hover:bg-status-rose-bg"
              >
                <Icon name="trash" className="size-3.5" />
                Delete selected
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-sm text-ink-muted hover:text-ink"
              >
                Clear
              </button>
            </>
          ) : null}

          {note ? (
            <span
              role={failed ? "alert" : "status"}
              className={cn(
                "ml-auto text-sm",
                failed ? "text-status-rose" : "text-status-green",
              )}
            >
              {note}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-3",
          view === "grid"
            ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1",
        )}
      >
        {jobs.map((job) => (
          <JobGridCard
            key={job.id}
            job={job}
            selected={selected.has(job.id)}
            onSelect={job.applicant_count === 0 ? () => toggle(job.id) : undefined}
            onDelete={
              job.applicant_count === 0 ? () => setPending([job]) : undefined
            }
          />
        ))}
      </div>

      <ConfirmDialog
        open={pending !== null}
        busy={busy}
        title={
          pending && pending.length === 1
            ? "Delete this job posting?"
            : `Delete ${pending?.length ?? 0} job postings?`
        }
        confirmLabel={
          pending && pending.length === 1 ? "Delete" : `Delete ${pending?.length}`
        }
        onCancel={() => setPending(null)}
        onConfirm={confirmDelete}
        body={
          <>
            <p>
              This cannot be undone.{" "}
              {pending && pending.length === 1
                ? "The posting and its draft content are removed for good."
                : "The postings and their draft content are removed for good."}
            </p>
            {pending && pending.length > 1 ? (
              <ul className="mt-2 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5">
                {pending.map((job) => (
                  <li key={job.id} className="text-ink">
                    {job.title}
                  </li>
                ))}
              </ul>
            ) : pending ? (
              <p className="mt-2 font-medium text-ink">{pending[0].title}</p>
            ) : null}
          </>
        }
      />
    </>
  );
}
