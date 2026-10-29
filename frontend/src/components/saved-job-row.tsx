import Link from "next/link";

import { ApplyButton } from "@/components/job-actions";
import { Icon } from "@/components/ui/icon";
import { relativeDays, type Job } from "@/lib/api";

/**
 * One row of the Saved Jobs list, built to frame 11:4946.
 *
 * 76px tall, 16px/24px padding, the title and its timestamp stacked on the
 * left and the actions grouped 24px apart on the right, with a Neutral/100
 * hairline between rows. A row rather than a card because a saved list is a
 * to-do list: the question it answers is "which of these have I not applied
 * to yet", and rows answer that down a single column.
 *
 * Applying happens on the row. Saving a job and then having to open it to
 * apply is the step this page exists to remove.
 */

/* Both states are the frame's 38px button: 14/20 semibold on 14px of
   horizontal padding, with the border counted in the height. */
const ACTION =
  "inline-flex items-center justify-center rounded-lg border px-3.5 py-2 text-sm font-semibold leading-5 shadow-xs";

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

  /*
   * A posting nobody can apply to any more (11:4963). Recently viewed keeps
   * showing it because you did look at it, but the frame greys the whole row
   * and drops both actions rather than offering an Apply that would fail.
   */
  const closed =
    job.status !== "active" ||
    (job.days_until_close !== null && job.days_until_close < 0);

  if (closed) {
    return (
      <li className="flex min-h-[76px] flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-canvas px-6 py-4">
        <div className="flex min-w-44 flex-col gap-0.5">
          <h3 className="text-base font-semibold leading-6 text-ink-faint">
            {job.title}
          </h3>
          <p className="flex items-center gap-1 text-xs leading-[18px] text-ink-faint">
            <Icon name="clock" className="size-3.5 shrink-0" />
            {stamp ? `${verb} ${savedWhen(stamp)}` : verb}
          </p>
        </div>

        <p className="flex items-center gap-1.5 text-sm font-semibold leading-5 text-ink-faint">
          <Icon name="alert-circle" className="size-4 shrink-0" />
          Applications closed
        </p>
      </li>
    );
  }

  return (
    /* The hairline is an inset shadow rather than a border: the frame
       stacks its rows at exactly 76px each, and a real border would add a
       4th pixel over five rows. */
    <li className="flex min-h-[76px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4 shadow-[inset_0_-1px_0_0_var(--color-line-soft)] last:shadow-none">
      {/* --- Left: title and when it was saved ------------------------- */}
      <div className="flex min-w-44 flex-col gap-0.5">
        {/* Neutral/800, not the near-black the headings use: on the frame
            the row title is a shade quieter than a page heading. */}
        <h3 className="text-base font-semibold leading-6 text-ink-body">
          <Link
            href={`/jobs/${job.id}`}
            className="transition-colors hover:text-brand-700"
          >
            {job.title}
          </Link>
        </h3>

        <p className="flex items-center gap-1 text-xs leading-[18px] text-ink-faint">
          <Icon name="clock" className="size-3.5 shrink-0" />
          {stamp ? `${verb} ${savedWhen(stamp)}` : verb}
        </p>
      </div>

      {/* --- Right: the actions, 24px apart ---------------------------- */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {job.closes_soon && !job.has_applied ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold leading-5 text-closing-soon">
            <Icon name="alert-circle" className="size-4 shrink-0" />
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
          <span
            className={`${ACTION} cursor-default border-applied-bg bg-applied-bg text-applied-ink`}
          >
            Already applied
          </span>
        ) : (
          <ApplyButton
            jobId={job.id}
            buttonClassName={`${ACTION} border-brand-secondary bg-brand-secondary text-brand-secondary-ink transition-colors hover:border-brand-secondary-hover hover:bg-brand-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200`}
          />
        )}

        <Link
          href={`/jobs/${job.id}`}
          className="group inline-flex items-center gap-2 text-sm font-semibold leading-5 text-brand-800 transition-colors hover:text-brand-700"
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
