import Link from "next/link";

import { ApplyButton } from "@/components/job-actions";
import { Icon } from "@/components/ui/icon";
import { relativeDays, type Job } from "@/lib/api";

/**
 * One row on the Saved Jobs list.
 *
 * Title and when it was saved on the left; on the right, a "Closing soon!"
 * warning where it applies, then either Apply now or a disabled "Already
 * applied", then the link through to the job.
 */
export function SavedJobRow({ job }: { job: Job }) {
  const closed = job.status === "closed" || job.status === "draft";

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-line bg-card px-5 py-4">
      <div className="min-w-0">
        <h2 className="font-semibold text-ink-strong">
          <Link href={`/jobs/${job.id}`} className="hover:text-brand-700">
            {job.title}
          </Link>
        </h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-subtle">
          <Icon name="clock" className="size-3.5 shrink-0" />
          Saved {relativeDays(job.saved_at).toLowerCase()}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {job.closes_soon && !job.has_applied ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-orange">
            <Icon name="clock" className="size-4 shrink-0" />
            Closing soon!
          </span>
        ) : null}

        {job.has_applied ? (
          <span className="rounded-lg bg-brand-100 px-4 py-2 text-sm font-medium text-brand-300">
            Already applied
          </span>
        ) : closed ? (
          <span className="rounded-lg bg-card-muted px-4 py-2 text-sm font-medium text-ink-subtle">
            Applications closed
          </span>
        ) : (
          <ApplyButton jobId={job.id} />
        )}

        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-ink transition-colors hover:text-brand-700"
        >
          View job details
          <Icon name="chevron-right" className="size-4" />
        </Link>
      </div>
    </li>
  );
}
