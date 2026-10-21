/**
 * The job surfaces from the Cards and Rows frames: overview card, recommended
 * card, grid card, category card, job rows and the profile progress row.
 */

import Link from "next/link";

import { SaveButton } from "@/components/job-actions";
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
          <h3 className="font-semibold break-words text-ink-strong">
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
export function RecommendedJobCard({
  job,
  withAction = false,
  saved = false,
}: {
  job: Job;
  /**
   * Show a "View job details" button and a save control, as the Recommended
   * Jobs page does. The dashboard uses the compact form, where the whole
   * card is the link.
   */
  withAction?: boolean;
  saved?: boolean;
}) {
  /*
   * The card used to print the first three lines of the job description.
   * Every posting opens with the same boilerplate — who the employer of
   * record is, how onboarding and payroll work — so three cards side by
   * side said the same thing three times and none of them said where the
   * job was or what it paid. The facts a candidate scans for go here
   * instead; the description is one click away.
   */
  const facts = [
    job.location,
    job.work_setup_label,
    job.employment_label,
    job.salary_label,
  ].filter(Boolean);

  return (
    <Card
      className={cn(
        "group flex h-full flex-col p-5 transition-colors hover:border-line-strong",
        // Only stretch the title over the card when nothing else inside is
        // clickable, or the overlay swallows the save button.
        !withAction && "relative",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold break-words text-ink-strong">
            <Link
              href={`/jobs/${job.id}`}
              className={cn(
                "hover:text-brand-700",
                !withAction && "before:absolute before:inset-0",
              )}
            >
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm break-words text-ink-muted">{job.company}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {job.match ? (
            <span
              className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700"
              title="How well this role fits your profile"
            >
              {job.match.score}% match
            </span>
          ) : null}
          {withAction ? <SaveButton jobId={job.id} initialSaved={saved} /> : null}
        </div>
      </div>

      {facts.length > 0 ? (
        <ul className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          {facts.map((fact, index) => (
            <li key={fact} className="flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden className="text-ink-subtle">
                  ·
                </span>
              ) : null}
              {fact}
            </li>
          ))}
        </ul>
      ) : null}

      {job.match && job.match.reasons.length > 0 ? (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {job.match.reasons.slice(0, 4).map((reason) => (
            <MatchChip
              key={reason.label}
              label={reason.label}
              level={reason.level}
            />
          ))}
        </div>
      ) : null}

      {/* Pushes the footer down so cards in a row line up. */}
      <div className="flex-1" />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <span className="flex items-center gap-1 text-xs text-ink-subtle">
          <Icon name="clock" className="size-3" />
          {relativeDays(job.posted_at)}
        </span>
        <Deadline job={job} />
      </div>

      {withAction ? (
        <Link
          href={`/jobs/${job.id}`}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-100 px-4 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-200"
        >
          View job details
          <Icon name="chevron-right" className="size-4" />
        </Link>
      ) : null}
    </Card>
  );
}

/** When applications close, shouted about only when it is actually close. */
function Deadline({ job }: { job: Job }) {
  const days = job.days_until_close;

  if (days !== null && days >= 0 && days <= 14) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
          days <= 3
            ? "bg-status-rose-bg text-status-rose"
            : "bg-status-orange-bg text-status-orange",
        )}
      >
        <Icon name="clock" className="size-3" />
        {days === 0
          ? "Closes today"
          : days === 1
            ? "Closes tomorrow"
            : `Closes in ${days} days`}
      </span>
    );
  }

  return (
    <span className="text-xs text-ink-subtle">
      Closes {formatDate(job.closes_at)}
    </span>
  );
}

/** Grid card — the hiring manager view of a posting. */
export function JobGridCard({
  job,
  selected = false,
  onSelect,
  onDelete,
}: {
  job: Job;
  selected?: boolean;
  /** Omitted when the posting cannot be deleted, which is what selection is for. */
  onSelect?: () => void;
  onDelete?: () => void;
}) {
  const tone = JOB_STATUS_TONE[job.status] ?? "grey";
  const isDraft = job.status === "draft";

  return (
    <Card
      className={cn(
        "flex h-full flex-col p-5 transition-colors",
        selected && "border-brand-500 bg-brand-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {onSelect ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            aria-label={`Select ${job.title}`}
            className="mt-1 size-4 shrink-0 rounded border-line accent-brand-700"
          />
        ) : null}
        <h3 className="min-w-0 font-semibold text-balance break-words text-ink-strong">
          {job.title}
        </h3>
        <span className="shrink-0">
          <StatusBadge label={job.status_label} tone={tone} />
        </span>
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

      {/* Filled boxes rather than outlined, as the frame has them. */}
      <div className="mt-4 flex gap-2">
        <span className="flex-1 rounded-md bg-card-muted px-2.5 py-1.5 text-xs text-ink-muted">
          <strong className="font-semibold text-ink">{job.applicant_count}</strong>{" "}
          Total
        </span>
        <span className="flex-1 rounded-md bg-card-muted px-2.5 py-1.5 text-xs text-ink-muted">
          <strong className="font-semibold text-ink">
            {job.new_applicant_count}
          </strong>{" "}
          New
        </span>
      </div>

      {/* Pushes the action to the bottom so cards in a row line up. */}
      <div className="flex-1" />

      {/*
        The strong button is for a posting with applicants waiting; a draft
        or an empty posting gets the quiet one. The label follows: there is
        nothing to call "applicants" when none have applied.
      */}
      <div className="mt-4 flex items-center gap-2">
        <Button
          href={`/manager/jobs/${job.id}`}
          variant={job.applicant_count > 0 ? "primary" : "outline"}
          className="flex-1"
          size="sm"
        >
          {isDraft
            ? "View draft"
            : job.applicant_count > 0
              ? "View applicants"
              : "View job"}
          <Icon name="chevron-right" className="size-3.5" />
        </Button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${job.title}`}
            title={`Delete ${job.title}`}
            className={cn(
              // Red at rest, not only on hover: a bin that looks like every
              // other grey icon reads as "archive" until you hover it.
              "rounded-md border border-status-rose/30 p-1.5 text-status-rose transition-colors",
              "hover:border-status-rose/60 hover:bg-status-rose-bg",
            )}
          >
            <Icon name="trash" className="size-3.5" />
          </button>
        ) : null}
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
        <p className="font-medium break-words text-ink-strong">{job.title}</p>
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
