import Link from "next/link";

import { JobStatusActions } from "@/components/job-status-actions";
import { Icon } from "@/components/ui/icon";
import { JOB_STATUS_TONE, StatusBadge } from "@/components/ui/primitives";
import { formatDate, type Job } from "@/lib/api";

/**
 * The top of a posting's own page, to the Figma frame.
 *
 * Title and status on the left over a link into the seeker's view, the two
 * facts a manager checks first in a divided column beside it, and the
 * status controls boxed off on the right under their own label.
 *
 * Boxing the controls is the part worth keeping. They used to be a row of
 * eight equal buttons — Edit, Pause, Make private, Close, Duplicate,
 * Delete, Preview, Close job — where the one that takes the posting off the
 * board sat next to the one that deletes it, at the same weight. Grouping
 * them under JOB STATUS says what they are for, and leaves Close Job as the
 * only red thing on the screen.
 */
export function JobDetailHeader({ job }: { job: Job }) {
  return (
    <div className="flex flex-wrap items-stretch gap-5">
      <section className="flex min-w-80 flex-1 flex-wrap items-center gap-6 rounded-2xl bg-card p-6 shadow-xs">
        <div className="min-w-56 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-bold leading-8 tracking-tight text-ink-strong">
              {job.title}
            </h1>
            <StatusBadge
              label={job.status_label}
              tone={JOB_STATUS_TONE[job.status] ?? "grey"}
            />
          </div>
          <Link
            href={`/manager/jobs/${job.id}/preview`}
            className="mt-1 inline-flex items-center gap-1.5 text-sm text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            <Icon name="expand" className="size-3.5" />
            View job details
          </Link>
        </div>

        {/* The rule only exists on a wide screen; stacked, it would be a
            line across the middle of nothing. */}
        <div aria-hidden className="hidden w-px self-stretch bg-line sm:block" />

        <dl className="w-56 space-y-3">
          <Fact icon="building" label="Hiring company" value={job.company} />
          <Fact
            icon="calendar"
            label="Applications close"
            value={job.closes_at ? formatDate(job.closes_at) : "No closing date"}
          />
        </dl>
      </section>

      <section className="flex w-full flex-col gap-2.5 rounded-2xl bg-card p-5 shadow-xs sm:w-60">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
          Job status
        </p>
        <JobStatusActions
          jobId={job.id}
          status={job.status}
          statusLabel={job.status_label}
          layout="panel"
        />
      </section>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: "building" | "calendar";
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon name={icon} className="size-4 shrink-0 text-ink-subtle" />
      <div className="min-w-0">
        <dt className="text-[11px] font-medium leading-4 text-ink-subtle">
          {label}
        </dt>
        <dd className="truncate text-sm font-semibold leading-5 text-ink-strong">
          {value}
        </dd>
      </div>
    </div>
  );
}

/**
 * The three counts across the top.
 *
 * On the frame they sit in a grey trough rather than floating on the page,
 * which keeps them reading as one band of context for the list below
 * instead of three unrelated cards.
 */
export function ApplicantStats({
  stats,
}: {
  stats: { total: number; saved: number; new: number };
}) {
  const cards = [
    { value: stats.total, title: "Total applicants", sub: "All", icon: "users" },
    {
      value: stats.saved,
      title: "Saved applicants",
      sub: "Profiles to take another look at",
      icon: "bookmark",
    },
    {
      value: stats.new,
      title: "New applications",
      sub: "Applications that haven't been viewed",
      icon: "sparkle",
    },
  ] as const;

  return (
    <div className="grid gap-5 rounded-2xl bg-trough p-5 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="flex min-h-[124px] items-center gap-4 rounded-lg border border-line bg-card px-6 py-5"
        >
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong text-ink-subtle"
          >
            <Icon name={card.icon} className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[30px] font-bold leading-[38px] text-ink-strong">
              {card.value}
            </p>
            <p className="text-sm font-semibold leading-5 text-ink-strong">
              {card.title}
            </p>
            <p className="text-xs leading-[18px] text-ink-subtle">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
