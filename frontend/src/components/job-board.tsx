import Link from "next/link";

import {
  ApplyButton,
  SaveForLaterButton,
  ShareButton,
} from "@/components/job-actions";
import { Icon } from "@/components/ui/icon";
import { Chip, cn } from "@/components/ui/primitives";
import { formatDate, relativeDays, skillName, type Job } from "@/lib/api";

/**
 * The job board surfaces: the filter rail, the result cards and the detail
 * pane beside them.
 *
 * Selection lives in the URL (?job=<id>) rather than in client state, so a
 * result is linkable, the back button works and the pane renders on the
 * server with the rest of the page.
 */

export type Params = Record<string, string | undefined>;

/** Build a querystring from the current params plus an override. */
export function withParam(params: Params, key: string, value?: string): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== key && k !== "job") next.set(k, v);
  }
  if (value) next.set(key, value);
  const qs = next.toString();
  return qs ? `/?${qs}` : "/";
}

function selectJobHref(params: Params, id: number): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "job") next.set(k, v);
  }
  next.set("job", String(id));
  return `/?${next.toString()}#detail`;
}

/* --- Filters --------------------------------------------------------------- */

const FILTER_GROUPS = [
  {
    key: "employment_type",
    label: "Job type",
    options: [
      ["full_time", "Full-time"],
      ["part_time", "Part-time"],
      ["contract", "Contract"],
      ["internship", "Internship"],
    ],
  },
  {
    key: "work_setup",
    label: "Work setup",
    options: [
      ["remote", "Remote"],
      ["hybrid", "Hybrid"],
      ["office", "In office"],
    ],
  },
  {
    key: "experience_level",
    label: "Experience",
    options: [
      ["entry", "Entry-level"],
      ["junior", "Junior"],
      ["intermediate", "Intermediate"],
      ["senior", "Senior"],
      ["manager", "Manager"],
    ],
  },
] as const;

export function FilterRail({ params }: { params: Params }) {
  const hasActive = FILTER_GROUPS.some((group) => params[group.key]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTER_GROUPS.map((group) => {
        const current = params[group.key];
        return (
          <details key={group.key} className="group relative">
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors [&::-webkit-details-marker]:hidden",
                current
                  ? "border-brand-700 bg-brand-700 font-medium text-white"
                  : "border-line-strong bg-card text-ink hover:border-ink-subtle",
              )}
            >
              {current
                ? group.options.find(([v]) => v === current)?.[1]
                : group.label}
              <Icon name="chevron-down" className="size-3.5" />
            </summary>

            <div className="absolute left-0 top-full z-20 mt-1.5 w-52 rounded-xl border border-line bg-card p-1.5 shadow-lg">
              {group.options.map(([value, label]) => (
                <Link
                  key={value}
                  href={withParam(
                    params,
                    group.key,
                    current === value ? undefined : value,
                  )}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                    current === value
                      ? "bg-brand-50 font-medium text-brand-700"
                      : "text-ink hover:bg-card-muted",
                  )}
                >
                  {label}
                  {current === value ? (
                    <Icon name="check" className="size-3.5" />
                  ) : null}
                </Link>
              ))}
            </div>
          </details>
        );
      })}

      {hasActive ? (
        <Link
          href={withParam(
            Object.fromEntries(
              Object.entries(params).filter(
                ([k]) => !FILTER_GROUPS.some((g) => g.key === k),
              ),
            ),
            "_",
          )}
          className="ml-1 text-sm font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
        >
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}

/* --- Shared bits ----------------------------------------------------------- */

/** A ticked fact — salary, employment type — as the job boards show them. */
function CheckChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-status-green-bg px-2 py-1 text-xs font-medium text-status-green">
      <Icon name="check" className="size-3" />
      {children}
    </span>
  );
}

/* --- Result card ----------------------------------------------------------- */

export function JobResultCard({
  job,
  params,
  selected,
}: {
  job: Job;
  params: Params;
  selected: boolean;
}) {
  return (
    <article
      className={cn(
        "relative rounded-xl border bg-card p-4 transition-shadow",
        selected
          ? "border-brand-700 ring-1 ring-brand-700"
          : "border-line hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
          {job.role_category}
        </span>
        <span className="relative z-10 -mr-1 -mt-1 rounded-full p-1.5 text-ink-subtle transition-colors hover:bg-card-muted hover:text-brand-700">
          <Icon name="bookmark" />
        </span>
      </div>

      <h3 className="mt-2 text-[17px] font-semibold leading-snug text-ink-strong">
        <Link
          href={selectJobHref(params, job.id)}
          scroll={false}
          className="before:absolute before:inset-0"
        >
          {job.title}
        </Link>
      </h3>

      <p className="mt-1.5 text-sm text-ink-muted">{job.company}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <CheckChip>{job.salary_label}</CheckChip>
        <CheckChip>{job.employment_label}</CheckChip>
        <CheckChip>{job.work_setup_label}</CheckChip>
      </div>

      {job.applicant_count > 0 ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-card-muted px-3 py-2 text-xs text-ink-muted">
          <Icon name="users" className="size-3.5 shrink-0" />
          {job.applicant_count}{" "}
          {job.applicant_count === 1 ? "person has" : "people have"} applied
        </p>
      ) : null}

      <p className="mt-3 text-xs text-ink-subtle">
        {job.posted_at
          ? `Posted ${relativeDays(job.posted_at).toLowerCase()}`
          : "Just posted"}
      </p>
    </article>
  );
}

/* --- Detail pane ----------------------------------------------------------- */

/* --- Detail pane ----------------------------------------------------------- */

const SKILL_LEVEL_LABEL: Record<string, string> = {
  required: "required",
  preferred: "preferred",
  optional: "optional",
};

/** Skills grouped the way the detail view lists them: required first. */
function skillLevel(entry: { name: string; level?: string } | string): string {
  return typeof entry === "string" ? "required" : (entry.level ?? "required");
}

const LEVEL_ORDER = ["required", "preferred", "optional"];

/**
 * The working day drawn on a 24-hour scale, as the detail view shows it.
 *
 * A shift that runs past midnight wraps, so it is drawn as two bars rather
 * than one that would otherwise read backwards.
 */
function WorkingHours({ job }: { job: Job }) {
  const start = job.working_hours_start;
  const end = job.working_hours_end;
  if (start === null || end === null) return null;

  const wraps = end <= start;
  const bars = wraps
    ? [
        { from: start, to: 24 },
        { from: 0, to: end },
      ]
    : [{ from: start, to: end }];

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-ink-strong">
          Working hours ({job.timezone_label})
        </h3>
        <p className="text-xs text-ink-muted">
          {job.working_hours_count} hours
          {wraps ? " · overnight" : ""}
        </p>
      </div>

      <div className="mt-4">
        <div className="relative h-2 rounded-full bg-card-muted">
          {bars.map((bar) => (
            <div
              key={`${bar.from}-${bar.to}`}
              className="absolute inset-y-0 rounded-full bg-brand-300"
              style={{
                left: `${(bar.from / 24) * 100}%`,
                width: `${((bar.to - bar.from) / 24) * 100}%`,
              }}
            />
          ))}
        </div>

        <div className="mt-2 flex justify-between text-[11px] text-ink-subtle">
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hour) => (
            <span key={hour}>{String(hour % 24).padStart(2, "0")}</span>
          ))}
        </div>

        <p className="mt-2 text-sm text-ink">{job.working_hours_label}</p>
      </div>
    </section>
  );
}

export function JobDetailPane({ job }: { job: Job }) {
  const skills = [...job.required_skills].sort(
    (a, b) => LEVEL_ORDER.indexOf(skillLevel(a)) - LEVEL_ORDER.indexOf(skillLevel(b)),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-7 py-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink-strong">
            {job.title}
          </h2>
          <span className="shrink-0 pt-1 text-xs text-ink-subtle">
            Job ID: {job.id}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip icon={<Icon name="building" className="size-3" />}>
            {job.work_setup_label}
          </Chip>
          <Chip>{job.salary_label}</Chip>
          <Chip>{job.experience_label}</Chip>
          <Chip>{job.employment_label}</Chip>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink">
          This {job.work_setup_label.toLowerCase()} job is based in{" "}
          {job.location || job.company_location} for a{" "}
          {job.company_industry.toLowerCase() || "professional services"} company
          in {job.company_location || job.location}.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <ApplyButton
            jobId={job.id}
            initialApplied={job.has_applied ?? false}
            className="min-w-48 flex-1"
          />
          <SaveForLaterButton jobId={job.id} initialSaved={job.is_saved ?? false} />
          <ShareButton jobId={job.id} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-6">
        {job.about_company ? (
          <section>
            <h3 className="font-semibold text-ink-strong">About the company:</h3>
            <p className="mt-2 leading-relaxed text-ink-muted">
              {job.about_company}
            </p>
          </section>
        ) : null}

        {job.key_responsibilities.length > 0 ? (
          <section className="mt-6">
            <h3 className="font-semibold text-ink-strong">Key responsibilities:</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
              {job.key_responsibilities.map((item) => (
                <li key={item} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {skills.length > 0 ? (
          <section className="mt-6">
            <h3 className="font-semibold text-ink-strong">Skills:</h3>
            <ul className="mt-2 space-y-1 text-ink-muted">
              {skills.map((skill) => (
                <li key={skillName(skill)}>
                  {skillName(skill)}{" "}
                  <span className="text-ink-subtle">
                    ({SKILL_LEVEL_LABEL[skillLevel(skill)] ?? skillLevel(skill)})
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {job.software_tools.length > 0 ? (
          <section className="mt-6">
            <h3 className="font-semibold text-ink-strong">Software tools:</h3>
            <ul className="mt-2 space-y-1 text-ink-muted">
              {job.software_tools.map((tool) => (
                <li key={tool.name}>
                  {tool.name}{" "}
                  <span className="text-ink-subtle">({tool.proficiency})</span>
                </li>
              ))}
            </ul>
            {job.advantageous_tools.length > 0 ? (
              <p className="mt-2 text-ink-muted">
                {job.advantageous_tools.join(" and ")} would be advantageous.
              </p>
            ) : null}
          </section>
        ) : null}

        <WorkingHours job={job} />

        <div className="mt-8 border-t border-line pt-5 text-center">
          <Link
            href={`/jobs/${job.id}`}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            View additional details
          </Link>
        </div>
      </div>

      <div className="border-t border-line bg-card-muted px-7 py-3">
        <p className="text-xs text-ink-subtle">
          Last edited on {formatDate(job.updated_at)}
        </p>
      </div>
    </div>
  );
}
