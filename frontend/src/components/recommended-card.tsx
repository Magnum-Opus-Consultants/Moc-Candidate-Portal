import Link from "next/link";

import { SaveButton } from "@/components/job-actions";
import { Icon } from "@/components/ui/icon";
import { MatchChip } from "@/components/ui/primitives";
import { relativeDays, type Job } from "@/lib/api";

/**
 * A recommended job, as the Recommended Jobs frame draws it.
 *
 * Not JobResultCard: that one is a row in a two-pane board, where the detail
 * pane beside it carries the description and the card only has to identify
 * the job. This stands alone in a grid with nothing beside it, so it has to
 * say enough on its own to be worth clicking — hence the description excerpt
 * and the closing date, and hence the full-width action at the foot rather
 * than a stretched link over the whole card.
 *
 * The match reasons are the reason this page exists, so they sit in the
 * middle of the card rather than being summarised as a score. Three fit,
 * and the rest collapse into a count — the frame's "+2 more".
 */

/** How many reasons are shown before the rest become a count. */
const SHOWN_REASONS = 3;

export function RecommendedCard({
  job,
  href,
  saved = false,
}: {
  job: Job;
  /** Where "View job details" leads. */
  href: string;
  saved?: boolean;
}) {
  const reasons = job.match?.reasons ?? [];
  // Matches before partials: the strongest reason to click should be the
  // first thing read, and the engine does not order them for display.
  const ordered = [...reasons].sort((a, b) =>
    a.level === b.level ? 0 : a.level === "match" ? -1 : 1,
  );
  const shown = ordered.slice(0, SHOWN_REASONS);
  const extra = ordered.length - shown.length;

  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold leading-snug text-ink-strong">
          <Link
            href={href}
            className="transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:underline"
          >
            {job.title}
          </Link>
        </h3>
        <span className="-mr-1 -mt-1 shrink-0">
          <SaveButton jobId={job.id} initialSaved={saved} compact />
        </span>
      </div>

      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-subtle">
        <Icon name="clock" className="size-3.5 shrink-0" />
        {job.posted_at
          ? `Added ${relativeDays(job.posted_at).toLowerCase()}`
          : "Just added"}
      </p>

      {/* The company is not in the frame, but a job with no employer on it
          is not something anyone can judge — it goes on the same line as
          the location, which the frame also leaves out. */}
      <p className="mt-2 truncate text-xs text-ink-muted">
        {[job.company, job.location].filter(Boolean).join(" · ")}
      </p>

      {job.description ? (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
          {job.description}
        </p>
      ) : null}

      {shown.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {shown.map((reason) => (
            <MatchChip
              key={reason.label}
              label={reason.label}
              level={reason.level}
            />
          ))}
          {extra > 0 ? (
            <span
              className="rounded bg-card-muted px-2 py-0.5 text-xs font-medium text-ink-muted"
              title={ordered
                .slice(SHOWN_REASONS)
                .map((reason) => reason.label)
                .join(", ")}
            >
              +{extra} more
            </span>
          ) : null}
        </div>
      ) : null}

      {/* mt-auto pins the foot to the bottom, so buttons line up across a
          row whose cards have descriptions of different lengths. */}
      <div className="mt-auto pt-3">
        {job.closes_at ? (
          <p className="text-xs text-ink-subtle">
            Applications close {formatClosing(job.closes_at)}
          </p>
        ) : null}

        <Link
          href={href}
          className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-50 px-4 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          View job details
          <Icon name="chevron-right" className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}

/** dd/mm/yyyy, as the frame has it and as South Africa reads dates. */
function formatClosing(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
