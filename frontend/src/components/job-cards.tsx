/**
 * The job surfaces from the Cards and Rows frames: overview card, recommended
 * card, grid card, category card, job rows and the profile progress row.
 */

import Link from "next/link";

import { SaveButton } from "@/components/job-actions";
import { MatchBadges } from "@/components/match-badges";
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
import {
  formatDate,
  relativeDays,
  type Job,
  type MatchReason,
  type ProfileSection,
} from "@/lib/api";

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
          <h3 className="font-semibold text-pretty text-ink-strong">
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
        {job.candidate_description}
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
  saved = false,
  on = "panel",
}: {
  job: Job;
  saved?: boolean;
  /**
   * Where the card sits. Inside a white panel (the dashboard) it takes
   * Neutral/100 and an 8px radius so it reads as a tile; on the page itself
   * (Recommended Jobs) it takes Base/White and 12px, because there it is
   * the surface rather than something on one.
   */
  on?: "panel" | "page";
}) {
  /*
   * Frame 118:3834. Title and bookmark, when it was added, the opening of
   * the description, a rule, the match badges, the closing date and the
   * action - in that order, on Neutral/100 rather than the page white so
   * the card reads as a tile inside its panel.
   */
  const reasons = job.match?.reasons ?? [];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-6 py-5 shadow-xs",
        on === "page" ? "rounded-xl bg-card" : "rounded-lg bg-canvas",
      )}
    >
      <div className="flex w-full flex-col">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/jobs/${job.id}`}
            className="min-w-0 truncate text-lg font-semibold leading-7 text-ink-strong hover:text-brand-700"
          >
            {job.title}
          </Link>
          <SaveButton jobId={job.id} initialSaved={saved} bare />
        </div>

        {/* h-4 because the frame's row is the 16px clock, with the 18px
            label centred on it - not 18px tall. */}
        <span className="flex h-4 items-center gap-1.5 text-xs font-medium leading-[18px] text-ink-faint">
          <Icon name="clock" className="size-4 shrink-0" />
          Added {relativeDays(job.posted_at).toLowerCase()}
        </span>
      </div>

      {job.candidate_description ? (
        <p className="line-clamp-3 text-xs leading-[18px] text-ink-muted">
          {job.candidate_description}
        </p>
      ) : null}

      <div aria-hidden className="relative h-0 w-full">
        <span className="absolute inset-x-0 -top-px block h-px bg-line" />
      </div>

      <MatchBadges reasons={reasons} on={on} />

      <p className="text-xs leading-[18px] text-ink-faint">
        Applications close {formatDate(job.closes_at)}
      </p>

      <Link
        href={`/jobs/${job.id}`}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-secondary-100 bg-brand-secondary-100 px-3.5 py-2 text-sm font-semibold leading-5 text-brand-800 shadow-xs transition-colors hover:border-brand-secondary-200 hover:bg-brand-secondary-200"
      >
        View job details
        <Icon name="chevron-right" className="size-5" />
      </Link>
    </div>
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

/**
 * The call to action at the foot of a grid card.
 *
 * Driven by status rather than by applicant count, which is how the frame
 * reads: a live posting sends you to its applicants, a paused one to the
 * posting, a draft back into the editor. Three weights of button, strongest
 * for the one that still needs work doing.
 */
const GRID_CTA: Record<string, { label: string; className: string }> = {
  active: {
    label: "View applicants",
    className:
      "border-brand-secondary bg-brand-secondary text-brand-secondary-ink " +
      "hover:border-brand-secondary-hover hover:bg-brand-secondary-hover",
  },
  paused: {
    label: "View job",
    className:
      "border-brand-secondary-100 bg-brand-secondary-100 text-brand-800 " +
      "hover:border-brand-200 hover:bg-brand-200",
  },
  draft: {
    label: "View draft",
    className:
      "border-line-strong bg-card text-ink-muted hover:bg-card-muted",
  },
};

// Closed and private postings take the quiet treatment, but they are not
// drafts, so they read "View job".
const GRID_CTA_FALLBACK = { ...GRID_CTA.draft, label: "View job" };

/** Grid card — the hiring manager view of a posting. */
export function JobGridCard({ job }: { job: Job }) {
  const tone = JOB_STATUS_TONE[job.status] ?? "grey";
  const cta = GRID_CTA[job.status] ?? GRID_CTA_FALLBACK;

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-card px-6 py-5">
      <div className="flex items-start justify-between gap-2">
        {/* The frame gives the title a fixed width and lets it clip, so a
            long one never pushes the badge off the card. */}
        <h3 className="min-w-0 truncate text-sm font-semibold leading-5 text-ink-strong">
          {job.title}
        </h3>
        <span className="shrink-0">
          <StatusBadge label={job.status_label} tone={tone} />
        </span>
      </div>

      <dl className="flex flex-col gap-1.5 text-xs leading-[18px] text-ink-subtle">
        <div className="flex items-center gap-1.5">
          <Icon name="calendar" className="size-3.5 shrink-0" />
          <dd className="truncate">Closes {formatDate(job.closes_at)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon name="clock" className="size-3.5 shrink-0" />
          <dd className="truncate">
            {job.posted_at ? `Posted ${formatDate(job.posted_at)}` : "Not published"}
          </dd>
        </div>
      </dl>

      <div className="flex gap-2">
        <StatChip value={job.applicant_count} label="Total" />
        <StatChip value={job.new_applicant_count} label="New" />
      </div>

      {/* Pushes the action to the bottom so cards in a row line up. */}
      <div className="flex-1" />

      <Link
        href={`/manager/jobs/${job.id}`}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg border px-3.5 py-2",
          "text-sm font-semibold leading-5 shadow-xs transition-colors",
          cta.className,
        )}
      >
        {cta.label}
        <Icon name="chevron-right" className="size-5" />
      </Link>
    </div>
  );
}

function StatChip({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex flex-1 items-center gap-1.5 rounded-lg bg-canvas px-3 py-2">
      <strong className="text-sm font-bold leading-5 text-ink-strong">
        {value}
      </strong>
      <span className="text-xs font-medium leading-[18px] text-ink-faint">
        {label}
      </span>
    </span>
  );
}

/**
 * A row in Saved Jobs or Recently viewed (frame 11:4903).
 *
 * Same shape for both panels; only the action differs - a saved job offers
 * "Apply now", a viewed one "View job details". The timestamp underneath is
 * what each list is ordered by, so it is part of the row, not decoration.
 */
export function SavedViewedRow({
  job,
  at,
  verb,
  action,
  divided,
}: {
  job: Job;
  at: string;
  /** "Saved" or "Viewed" - the row says which it means. */
  verb: string;
  action: "apply" | "details";
  divided: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-6 py-4",
        divided && "border-b border-line-soft",
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          href={`/jobs/${job.id}`}
          className="truncate text-base font-semibold text-ink-body hover:text-brand-700"
        >
          {job.title}
        </Link>
        <span className="flex items-center gap-1 text-xs text-ink-faint">
          <Icon name="clock" className="size-3.5 shrink-0" />
          {verb} {relativeDays(at).toLowerCase()}
        </span>
      </div>

      {action === "apply" ? (
        <Link
          href={`/jobs/${job.id}`}
          className="shrink-0 rounded-lg border border-brand-secondary bg-brand-secondary px-3.5 py-2 text-sm font-semibold leading-5 text-brand-secondary-ink shadow-xs transition-colors hover:border-brand-secondary-hover hover:bg-brand-secondary-hover"
        >
          Apply now
        </Link>
      ) : (
        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold leading-5 text-brand-800"
        >
          View job details
          <Icon name="chevron-right" className="size-5" />
        </Link>
      )}
    </div>
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
        <p className="font-medium text-pretty text-ink-strong">{job.title}</p>
        <p className="text-xs text-ink-subtle">
          {stamp ?? job.location}
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
      {/*
        The label takes the slack and the bar a fixed slice, rather than the
        other way round. With a fixed w-48 label the row had ~544px of
        shrink-0 width and burst the narrow profile column on the dashboard.
      */}
      <span className="min-w-0 flex-1 truncate text-sm text-ink">
        {section.label}
      </span>
      <div className="hidden w-28 shrink-0 sm:block">
        <ProgressBar value={section.progress} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-ink-muted">
        {section.progress}%
      </span>
      {section.completed ? (
        <span className="hidden w-28 shrink-0 items-center justify-end gap-1.5 text-xs font-medium text-status-green lg:flex">
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
