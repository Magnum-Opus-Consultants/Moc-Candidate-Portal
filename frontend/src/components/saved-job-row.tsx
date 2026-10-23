import Link from "next/link";

import { ApplyButton } from "@/components/job-actions";
import { Icon } from "@/components/ui/icon";
import { relativeDays, type Job } from "@/lib/api";

/**
 * One row of the Saved Jobs list, built to the frame's measurements.
 *
 * 76px tall, 16px/24px padding, the title and its timestamp stacked on the
 * left and the actions grouped 24px apart on the right, with a soft hairline
 * between rows. A row rather than a card because a saved list is a to-do
 * list: the question it answers is "which of these have I not applied to
 * yet", and rows answer that down a single column.
 *
 * Applying happens on the row. Saving a job and then having to open it to
 * apply is the step this page exists to remove.
 */
export function SavedJobRow({
  job,
  when,
}: {
  job: Job & { saved_at?: string; viewed_at?: string };
  /**
   * The verb in front of the timestamp. Recently viewed is the same row with
   * a different word, so it shares this rather than having a near-copy that
   * drifts out of step with it.
   */
  when?: "saved" | "viewed";
}) {
  const stamp = when === "viewed" ? job.viewed_at : job.saved_at;
  const verb = when === "viewed" ? "Viewed" : "Saved";
  return (
    <li className="flex min-h-[76px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
      {/* --- Left: title and when it was saved ------------------------- */}
      <div className="min-w-44">
        <h3 className="text-base font-semibold leading-6 text-ink-strong">
          <Link
            href={`/jobs/${job.id}`}
            className="transition-colors hover:text-brand-700"
          >
            {job.title}
          </Link>
        </h3>

        <p className="mt-0.5 flex items-center gap-1 text-xs leading-[18px] text-ink-subtle">
          <Icon name="clock" className="size-3.5 shrink-0" />
          {stamp ? `${verb} ${savedWhen(stamp)}` : verb}
        </p>
      </div>

      {/* --- Right: the actions, 24px apart ---------------------------- */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {job.closes_soon && !job.has_applied ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold leading-[21px] text-status-yellow">
            <Icon name="clock" className="size-4 shrink-0" />
            {job.days_until_close === 0
              ? "Closes today!"
              : job.days_until_close === 1
                ? "Closes tomorrow!"
                : "Closing soon!"}
          </p>
        ) : null}

        {job.has_applied ? (
          /*
            A span, not a disabled button: there is nothing to press, and a
            disabled control that still takes focus is a dead end for anyone
            on a keyboard.
          */
          <span className="inline-flex h-9 cursor-default items-center rounded-lg border border-applied-bg bg-applied-bg px-3.5 text-sm font-semibold leading-5 text-applied-ink shadow-xs">
            Already applied
          </span>
        ) : (
          <ApplyButton
            jobId={job.id}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-panel-action bg-panel-action px-3.5 text-sm font-semibold leading-5 text-panel-ink shadow-xs transition-colors hover:border-panel-action-hover hover:bg-panel-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          />
        )}

        <Link
          href={`/jobs/${job.id}`}
          className="group inline-flex items-center gap-2 text-sm font-semibold leading-5 text-brand-700 transition-colors hover:text-brand-800"
        >
          View job details
          <Icon
            name="chevron-right"
            className="size-5 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </li>
  );
}

/** "today", "1 day ago", "1 week ago" — as the frame phrases it. */
function savedWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return relativeDays(iso).toLowerCase();

  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  return relativeDays(iso).toLowerCase();
}
