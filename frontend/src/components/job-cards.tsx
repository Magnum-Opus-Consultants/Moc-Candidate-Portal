/**
 * The job surfaces from the Cards and Rows frames: overview card, recommended
 * card, grid card, category card, job rows and the profile progress row.
 */

import Link from "next/link";

import { Icon, BookmarkFilled } from "@/components/ui/icon";
import {
  Button,
  Card,
  Chip,
  JOB_STATUS_TONE,
  MatchChip,
  ProgressBar,
  StatusBadge,
  cn,
} from "@/components/ui/primitives";
import { formatDate, relativeDays, type Job, type ProfileSection } from "@/lib/api";

export function JobChips({ job }: { job: Job }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip icon={<Icon name="building" className="size-3" />}>
        {job.work_setup_label}
      </Chip>
      <Chip>{job.salary_label}</Chip>
      <Chip>{job.experience_label}</Chip>
      <Chip>{job.employment_label}</Chip>
    </div>
  );
}

/** Job overview card — the main public listing card. */
export function JobOverviewCard({ job }: { job: Job }) {
  return (
    <Card className="group relative p-5 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-ink-strong">
            <Link href={`/jobs/${job.id}`} className="before:absolute before:inset-0">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm font-medium text-brand-700">
            {job.role_category}
          </p>
        </div>
        <span className="relative z-10 shrink-0 text-ink-subtle">
          {job.is_saved ? (
            <BookmarkFilled className="size-4 text-brand-800" />
          ) : (
            <Icon name="bookmark" />
          )}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-muted">
        {job.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Chip icon={<Icon name="building" className="size-3" />}>
          {job.work_setup_label}
        </Chip>
        <Chip>{job.salary_label}</Chip>
        <Chip icon={<Icon name="clock" className="size-3" />}>
          {job.timezone_label}
        </Chip>
      </div>
    </Card>
  );
}

/** Recommended job card — carries the match reasons as chips. */
export function RecommendedJobCard({ job }: { job: Job }) {
  return (
    <Card className="group relative flex flex-col p-5 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-ink-strong">
            <Link href={`/jobs/${job.id}`} className="before:absolute before:inset-0">
              {job.title}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-subtle">
            <Icon name="clock" className="size-3" />
            Added {relativeDays(job.posted_at).toLowerCase()}
          </p>
        </div>
        {job.match ? (
          <span className="shrink-0 rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700">
            {job.match.score}%
          </span>
        ) : null}
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted">
        {job.description}
      </p>

      {job.match && job.match.reasons.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.match.reasons.slice(0, 3).map((reason) => (
            <MatchChip
              key={reason.label}
              label={reason.label}
              level={reason.level}
            />
          ))}
          {job.match.reasons.length > 3 ? (
            <span className="text-xs text-ink-subtle">
              +{job.match.reasons.length - 3} more
            </span>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-xs text-ink-subtle">
        Applications close {formatDate(job.closes_at)}
      </p>

      <div className="mt-4 border-t border-line pt-3">
        <span className="relative z-10 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
          View job details
          <Icon name="chevron-right" className="size-3.5" />
        </span>
      </div>
    </Card>
  );
}

/** Grid card — the hiring manager view of a posting. */
export function JobGridCard({ job }: { job: Job }) {
  const tone = JOB_STATUS_TONE[job.status] ?? "grey";
  const isDraft = job.status === "draft";

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate font-semibold text-ink-strong">{job.title}</h3>
        <StatusBadge label={job.status_label} tone={tone} />
      </div>

      <dl className="mt-3 space-y-1.5 text-xs text-ink-muted">
        <div className="flex items-center gap-1.5">
          <Icon name="building" className="size-3.5" />
          <dd>{job.company}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon name="calendar" className="size-3.5" />
          <dd>Closes {formatDate(job.closes_at)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon name="clock" className="size-3.5" />
          <dd>
            {job.posted_at ? `Posted ${formatDate(job.posted_at)}` : "Not published"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2">
        <span className="flex-1 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-muted">
          <strong className="font-semibold text-ink">{job.applicant_count}</strong>{" "}
          Total
        </span>
        <span className="flex-1 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-muted">
          <strong className="font-semibold text-ink">
            {job.new_applicant_count}
          </strong>{" "}
          New
        </span>
      </div>

      <div className="mt-4">
        <Button
          href={`/manager/jobs/${job.id}`}
          variant={isDraft ? "outline" : "primary"}
          className="w-full"
          size="sm"
        >
          {isDraft ? "View draft" : "View applicants"}
          <Icon name="chevron-right" className="size-3.5" />
        </Button>
      </div>
    </Card>
  );
}

export function JobCategoryCard({
  name,
  jobCount,
  newCount,
}: {
  name: string;
  jobCount: number;
  newCount: number;
}) {
  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="font-medium text-ink-strong">{name}</p>
        <p className="text-xs text-ink-subtle">
          {jobCount} {jobCount === 1 ? "job" : "jobs"} in {name.toLowerCase()}
        </p>
      </div>
      {newCount > 0 ? (
        <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700">
          {newCount} new
        </span>
      ) : null}
    </Card>
  );
}

/** Saved / recently viewed job row. */
export function JobRow({
  job,
  context,
}: {
  job: Job;
  context?: "saved" | "viewed";
}) {
  const closed = job.status === "closed";
  const stamp =
    context === "viewed"
      ? `Viewed ${relativeDays(job.viewed_at).toLowerCase()}`
      : context === "saved"
        ? `Saved ${relativeDays(job.saved_at).toLowerCase()}`
        : null;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink-strong">{job.title}</p>
        <p className="text-xs text-ink-subtle">
          {stamp ?? `${job.company} · ${job.location}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {closed ? (
          <span className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <Icon name="close" className="size-3.5" />
            Applications closed
          </span>
        ) : job.has_applied ? (
          <Button variant="outline" size="sm" disabled>
            Already applied
          </Button>
        ) : (
          <Button href={`/jobs/${job.id}`} size="sm">
            Apply now
          </Button>
        )}
        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-700"
        >
          View job details
          <Icon name="chevron-right" className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

/** One of the eight profile sections, as a progress row. */
export function ProfileSectionRow({ section }: { section: ProfileSection }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        aria-hidden
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
          section.completed
            ? "bg-status-green-bg text-status-green"
            : "bg-card-muted text-ink-subtle",
        )}
      >
        {section.label.charAt(0)}
      </span>
      <span className="w-48 shrink-0 truncate text-sm text-ink">{section.label}</span>
      <div className="min-w-24 flex-1">
        <ProgressBar value={section.progress} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-ink-muted">
        {section.progress}%
      </span>
      {section.completed ? (
        <span className="flex w-28 shrink-0 items-center justify-end gap-1.5 text-xs font-medium text-status-green">
          Completed
          <Icon name="edit" className="size-3.5" />
        </span>
      ) : (
        <Link
          href="/portal/profile"
          className="flex w-28 shrink-0 items-center justify-end gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-muted transition-colors hover:border-line-strong"
        >
          Edit section
          <Icon name="chevron-right" className="size-3" />
        </Link>
      )}
    </div>
  );
}
