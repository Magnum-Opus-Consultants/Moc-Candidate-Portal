import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { Card, StatusBadge, JOB_STATUS_TONE, cn } from "@/components/ui/primitives";
import { formatDate, skillName, type Job } from "@/lib/api";

/**
 * The hiring manager's job details page, from the "Option A – Job details"
 * frame.
 *
 * Two columns: the posting itself on the left, and a rail of key details,
 * activity and the locked-fields notice on the right.
 *
 * The lock icons are the point of the page rather than decoration. Once a
 * posting is published, candidates have already matched and applied against
 * its title, company, role category, work setup and requirements — changing
 * those would silently invalidate every match and every application made on
 * them. So those fields are shown locked, and the way to change them is to
 * duplicate the posting and edit the copy, which is what the frame's
 * "Duplicate & edit" offers.
 */

/** A field that cannot be edited after publishing. */
function Lock({ when = true }: { when?: boolean }) {
  if (!when) return null;
  return (
    <Icon
      name="lock"
      className="size-3.5 shrink-0 text-ink-subtle"
    />
  );
}

function SectionHeading({
  children,
  locked,
  editHref,
}: {
  children: ReactNode;
  locked?: boolean;
  editHref?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-strong">
        {children}
        <Lock when={locked} />
      </h2>
      {editHref ? (
        <Link
          href={editHref}
          aria-label="Edit this section"
          className="rounded p-1 text-ink-subtle transition-colors hover:text-brand-700"
        >
          <Icon name="edit" className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

/** One label/value line in the right-hand Key details card. */
function KeyDetail({
  icon,
  label,
  value,
  footnote,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="mt-0.5 text-ink-subtle">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-subtle">{label}</p>
        <p className="text-sm font-medium break-words text-ink-strong">{value}</p>
        {footnote ? (
          <p className="mt-0.5 text-xs text-ink-subtle">{footnote}</p>
        ) : null}
      </div>
    </div>
  );
}

/** One row of the Activity card. */
function ActivityRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right font-medium text-ink-strong">{value}</span>
    </div>
  );
}

/** "Employment type · Full-time" in the Additional details table. */
function DetailRow({
  label,
  value,
  locked,
}: {
  label: string;
  value: ReactNode;
  locked?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-1.5">
      <span className="flex w-44 shrink-0 items-center gap-1.5 text-sm text-ink-muted">
        {label}
        <Lock when={locked} />
      </span>
      <span className="min-w-0 flex-1 text-sm break-words text-ink-strong">
        {value}
      </span>
    </div>
  );
}

/**
 * The stored night-shift value is a slug; the serializer does not send a
 * label for it, so read it here rather than printing "no" at the reader.
 */
const NIGHT_SHIFT: Record<string, string> = {
  yes: "Yes",
  no: "No",
  maybe: "Maybe",
  depends: "Depending on the role",
};

/** The salary range, written the way the frame writes it. */
function salaryRange(job: Job): string | null {
  if (!job.salary_min && !job.salary_max) return null;
  const money = (v: string | null) =>
    v ? Number(v).toLocaleString("en-ZA", { maximumFractionDigits: 0 }) : null;
  const low = money(job.salary_min);
  const high = money(job.salary_max);
  const per =
    job.salary_period === "monthly"
      ? "per month"
      : job.salary_period === "hourly"
        ? "per hour"
        : "per year";
  const currency = job.salary_currency || "ZAR";
  if (low && high) return `${currency} ${low} – ${high} ${per}`;
  return `${currency} ${low ?? high} ${per}`;
}

export function JobDetailsView({
  job,
  quickEditButton,
  duplicateButton,
  duplicateAndEditButton,
}: {
  job: Job;
  /** Rendered in the Key details card header; owned by the client wrapper. */
  quickEditButton?: ReactNode;
  duplicateButton?: ReactNode;
  duplicateAndEditButton?: ReactNode;
}) {
  const published = job.status !== "draft" && Boolean(job.posted_at);
  const skills = job.required_skills ?? [];
  const tools = job.software_tools ?? [];
  const responsibilities = job.key_responsibilities ?? [];
  const languages = job.language_requirements ?? [];
  const salary = salaryRange(job);
  const editHref = `/manager/jobs/${job.id}/edit`;

  return (
    <div className="space-y-5">
      {/* Header: back to the applicants page this one hangs off, and the
          two posting-level actions. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/manager/jobs/${job.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink-strong"
        >
          <Icon name="arrow-left" className="size-4" />
          Back to applicants
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {duplicateButton ?? (
            <Link
              href={`/manager/jobs/${job.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-card px-3.5 py-2 text-sm font-semibold text-ink shadow-xs transition-colors hover:bg-card-muted"
            >
              <Icon name="copy" className="size-4" />
              Duplicate job
            </Link>
          )}
          <Link
            href={editHref}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-secondary bg-brand-secondary px-3.5 py-2 text-sm font-semibold text-brand-secondary-ink shadow-xs transition-colors hover:border-brand-secondary-hover hover:bg-brand-secondary-hover"
          >
            <Icon name="edit" className="size-4" />
            Edit job post
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---- The posting ------------------------------------------- */}
        <Card className="min-w-0 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="flex min-w-0 items-center gap-2 text-[30px] leading-[38px] font-semibold break-words text-ink-strong">
              {job.title}
              <Lock when={published} />
            </h1>
            <span className="text-xs text-ink-subtle">Job ID: {job.id}</span>
          </div>

          <p className="mt-1 text-sm font-medium text-brand-700">
            {[job.role_category, job.company].filter(Boolean).join(" · ")}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {[
              job.work_setup_label,
              job.salary_label,
              job.experience_label,
              job.employment_label,
            ]
              .filter(Boolean)
              .map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs text-ink-muted"
                >
                  <Lock when={published} />
                  {chip}
                </span>
              ))}
          </div>

          {job.description ? (
            <p className="mt-4 text-sm leading-6 text-ink-muted">
              {job.description}
            </p>
          ) : null}

          {job.about_company ? (
            <section className="mt-6 border-t border-line pt-5">
              <SectionHeading editHref={editHref}>About the company:</SectionHeading>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                {job.about_company}
              </p>
            </section>
          ) : null}

          {responsibilities.length > 0 ? (
            <section className="mt-6">
              <SectionHeading editHref={editHref}>Key responsibilities:</SectionHeading>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-muted">
                {responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {skills.length > 0 ? (
            <section className="mt-6">
              <SectionHeading locked={published}>Skills:</SectionHeading>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-ink-muted">
                {skills.map((skill) => {
                  const level =
                    typeof skill === "string" ? null : (skill.level ?? null);
                  return (
                    <li key={skillName(skill)}>
                      {skillName(skill)}
                      {level ? ` (${level})` : ""}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {tools.length > 0 ? (
            <section className="mt-6">
              <SectionHeading locked={published}>Software tools:</SectionHeading>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-ink-muted">
                {tools.map((tool) => (
                  <li key={skillName(tool)}>
                    {skillName(tool)}
                    {typeof tool !== "string" && tool.proficiency
                      ? ` (${tool.proficiency})`
                      : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {job.working_hours_label ? (
            <section className="mt-6 border-t border-line pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink-strong">
                  Working hours ({job.timezone_label || "SAST"})
                </h2>
                <div className="flex items-center gap-3 text-xs text-ink-muted">
                  {job.working_hours_count ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="size-1.5 rounded-full bg-brand-500" />
                      {job.working_hours_count} hours
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="size-1.5 rounded-full bg-status-grey" />
                    {job.night_shift === "yes" ? "Night shift" : "Day shift"}
                  </span>
                  <Link
                    href={editHref}
                    aria-label="Edit working hours"
                    className="rounded p-1 transition-colors hover:text-brand-700"
                  >
                    <Icon name="edit" className="size-4" />
                  </Link>
                </div>
              </div>
              <HoursBar
                start={job.working_hours_start}
                end={job.working_hours_end}
              />
            </section>
          ) : null}

          <section className="mt-6 border-t border-line pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink-strong">
                Additional details:
              </h2>
              {published ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-subtle">
                  <Icon name="lock" className="size-3.5" />
                  Locked after publishing
                </span>
              ) : null}
            </div>

            <div className="mt-2 divide-y divide-line-soft">
              <DetailRow
                label="Employment type"
                value={job.employment_label}
                locked={published}
              />
              <DetailRow
                label="Work setup"
                value={job.work_setup_label}
                locked={published}
              />
              <DetailRow
                label="Employer location"
                value={job.company_location || job.location || "—"}
                locked={published}
              />
              <DetailRow
                label="Candidate location"
                value={job.candidate_location || "Anywhere"}
              />
              <DetailRow
                label="Citizenship"
                value={job.citizenship_requirement || "No specific requirement"}
                locked={published}
              />
              <DetailRow
                label="Experience level"
                value={
                  job.minimum_years_experience
                    ? `${job.experience_label} · ${job.minimum_years_experience}+ years`
                    : job.experience_label
                }
                locked={published}
              />
              <DetailRow
                label="Industry experience"
                value={job.industry_experience || "Not specified"}
                locked={published}
              />
              <DetailRow
                label="Education"
                value={
                  [job.education_requirement, job.field_of_study]
                    .filter(Boolean)
                    .join(" in ") || "Not specified"
                }
                locked={published}
              />
              <DetailRow
                label="Languages"
                value={
                  languages.length
                    ? languages
                        .map((l) => `${l.language} (${l.proficiency})`)
                        .join(", ")
                    : "Not specified"
                }
              />
              <DetailRow
                label="Night shift"
                value={NIGHT_SHIFT[job.night_shift] ?? "No"}
              />
              <DetailRow
                label="HR contact"
                value={
                  job.hr_email ? (
                    <a
                      href={`mailto:${job.hr_email}`}
                      className="text-brand-700 hover:underline"
                    >
                      {job.hr_email}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </section>
        </Card>

        {/* ---- The rail ---------------------------------------------- */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-ink-strong">
                Key details
              </h2>
              {quickEditButton ?? (
                <Link
                  href={editHref}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-card px-2.5 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-card-muted"
                >
                  <Icon name="edit" className="size-3.5" />
                  Quick edit
                </Link>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <KeyDetail
                icon={<Icon name="calendar" className="size-4" />}
                label="Ideal start date"
                value={job.ideal_start_date ? formatDate(job.ideal_start_date) : "Flexible"}
              />
              <KeyDetail
                icon={<Icon name="calendar" className="size-4" />}
                label="Applications close"
                value={formatDate(job.closes_at)}
              />
              <KeyDetail
                icon={<Icon name="clock" className="size-4" />}
                label="Working hours"
                value={`${job.working_hours_label || "To be confirmed"}${
                  job.flexible_hours ? " · Flexible" : ""
                }`}
              />
              {salary ? (
                <KeyDetail
                  icon={<Icon name="wallet" className="size-4" />}
                  label="Gross salary"
                  value={salary}
                  footnote={
                    job.salary_label
                      ? `Shown to candidates as “${job.salary_label}”`
                      : null
                  }
                />
              ) : null}
              {job.benefits?.length ? (
                <KeyDetail
                  icon={<Icon name="archive" className="size-4" />}
                  label="Benefits"
                  value={job.benefits.join(", ")}
                />
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink-strong">Activity</h2>
            <div className="mt-4 space-y-2.5">
              <ActivityRow
                label="Status"
                value={
                  <StatusBadge
                    label={job.status_label}
                    tone={JOB_STATUS_TONE[job.status] ?? "grey"}
                  />
                }
              />
              <ActivityRow
                label="Published"
                value={job.posted_at ? formatDate(job.posted_at) : "Not published"}
              />
              <ActivityRow
                label="Last edited"
                value={
                  <>
                    {formatDate(job.updated_at)}
                    {job.created_by_name ? ` by ${job.created_by_name}` : ""}
                  </>
                }
              />
              <ActivityRow
                label="Applicants"
                value={`${job.applicant_count} (${job.new_applicant_count} new)`}
              />
            </div>
          </Card>

          {published ? (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-strong">
                <Icon name="lock" className="size-4 text-ink-subtle" />
                Some details are locked
              </h2>
              <p className="mt-2 text-xs leading-5 text-ink-muted">
                The job title, company, role category, work setup and candidate
                requirements can&rsquo;t be changed once a job is published —
                candidates have already matched and been matched on them. To
                change these, duplicate this job and edit the copy, or create a
                new job.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {duplicateAndEditButton ?? (
                  <Link
                    href={`/manager/jobs/${job.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-card-muted"
                  >
                    <Icon name="copy" className="size-3.5" />
                    Duplicate &amp; edit
                  </Link>
                )}
                <Link
                  href="/manager/jobs/new"
                  className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:text-brand-800"
                >
                  Create new job
                </Link>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * The 24-hour bar from the frame, with the working window shaded.
 *
 * A plain div scale rather than a chart: it carries two numbers and reading
 * it is a glance, not an analysis.
 */
function HoursBar({
  start,
  end,
}: {
  start: number | null;
  end: number | null;
}) {
  if (start === null || end === null) return null;
  const left = (start / 24) * 100;
  const width = (Math.max(end - start, 0) / 24) * 100;

  return (
    <div className="mt-4">
      <div className="relative h-9 rounded-md bg-card-muted">
        <div
          className="absolute inset-y-0 rounded-md bg-brand-200"
          style={{ left: `${left}%`, width: `${width}%` }}
        >
          <span className="absolute -top-5 left-0 text-xs text-ink-muted">
            {String(start).padStart(2, "0")}:00
          </span>
          <span className="absolute -top-5 right-0 text-xs text-ink-muted">
            {String(end).padStart(2, "0")}:00
          </span>
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-subtle">
        {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
          <span key={h}>{String(h % 24).padStart(2, "0")}</span>
        ))}
      </div>
    </div>
  );
}
