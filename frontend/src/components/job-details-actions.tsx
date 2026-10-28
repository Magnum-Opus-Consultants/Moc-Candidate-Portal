"use client";

import { useState } from "react";

import { DuplicateEditModal } from "@/components/duplicate-edit-modal";
import { JobDetailsView } from "@/components/job-details-view";
import { QuickEdit, type QuickEditVariant } from "@/components/quick-edit";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import type { Job } from "@/lib/api";

/**
 * The job details page, with its interactive parts.
 *
 * This owns the open/closed state for quick edit and the duplicate modal,
 * and hands the buttons down to `JobDetailsView` so they sit where the
 * frame puts them — "Quick edit" in the Key details card header, "Duplicate
 * & edit" in the locked-details card — rather than being bolted on at the
 * bottom of the page.
 *
 * The three quick-edit presentations are all wired, because the design file
 * offers them as alternatives and nobody has chosen between them. The
 * switcher exists so they can be compared against real data; it is
 * scaffolding for that decision and should come out once it is made.
 */
export function JobDetailsClient({
  job,
  variant,
}: {
  job: Job;
  variant: QuickEditVariant;
}) {
  const [editing, setEditing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const quickEditButton = (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-card px-2.5 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-card-muted"
    >
      <Icon name="edit" className="size-3.5" />
      Quick edit
    </button>
  );

  const duplicateButton = (
    <button
      type="button"
      onClick={() => setDuplicating(true)}
      className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-card px-3.5 py-2 text-sm font-semibold text-ink shadow-xs transition-colors hover:bg-card-muted"
    >
      <Icon name="copy" className="size-4" />
      Duplicate job
    </button>
  );

  const duplicateAndEdit = (
    <button
      type="button"
      onClick={() => setDuplicating(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-card-muted"
    >
      <Icon name="copy" className="size-3.5" />
      Duplicate &amp; edit
    </button>
  );

  return (
    <div className="relative space-y-5">
      <Switcher jobId={job.id} current={variant} />

      {/* Option 2 opens above the posting, in the page flow. */}
      {variant === "inline" && editing ? (
        <QuickEdit
          job={job}
          variant="inline"
          open
          onClose={() => setEditing(false)}
        />
      ) : null}

      <JobDetailsView
        job={job}
        quickEditButton={quickEditButton}
        duplicateButton={duplicateButton}
        duplicateAndEditButton={duplicateAndEdit}
      />

      {/* Options 1 and 3 overlay the page. */}
      {variant !== "inline" && editing ? (
        <QuickEdit
          job={job}
          variant={variant}
          open
          onClose={() => setEditing(false)}
        />
      ) : null}

      <DuplicateEditModal
        job={job}
        open={duplicating}
        onClose={() => setDuplicating(false)}
      />
    </div>
  );
}

/** Scaffolding: compare the three quick-edit treatments on real data. */
function Switcher({
  jobId,
  current,
}: {
  jobId: number;
  current: QuickEditVariant;
}) {
  const options: Array<{ key: QuickEditVariant; label: string }> = [
    { key: "drawer", label: "1 · Side drawer" },
    { key: "inline", label: "2 · Inline panel" },
    { key: "floating", label: "3 · Floating panel" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-2 text-xs">
      <span className="text-ink-subtle">
        Quick edit style (for comparison — pick one and this comes out):
      </span>
      <div className="flex gap-1 rounded-lg bg-card-muted p-1">
        {options.map((o) => (
          <a
            key={o.key}
            href={`/manager/jobs/${jobId}/details?quickEdit=${o.key}`}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              current === o.key
                ? "bg-card text-ink-strong shadow-sm"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {o.label}
          </a>
        ))}
      </div>
    </div>
  );
}
