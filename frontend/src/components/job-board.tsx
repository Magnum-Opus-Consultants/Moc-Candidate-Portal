import Link from "next/link";

import {
  ApplyButton,
  SaveButton,
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

/**
 * Build a querystring from the current params plus an override.
 *
 * `base` is the route the link belongs to. It defaults to the public board,
 * which is where these helpers started, but the candidate portal reuses the
 * same layout on its own path.
 */
export function withParam(
  params: Params,
  key: string,
  value?: string,
  base = "/",
): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== key && k !== "job") next.set(k, v);
  }
  if (value) next.set(key, value);
  const qs = next.toString();
  return qs ? `${base}?${qs}` : base;
}

/** The values currently selected in one filter group. */
export function selectedIn(params: Params, key: string): string[] {
  return (params[key] ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}

/**
 * Add or remove one value from a filter group, leaving the others alone.
 *
 * Filters combine within a group as well as across them — picking Full-time
 * and Contract widens that group rather than replacing one with the other.
 */
export function toggleParam(
  params: Params,
  key: string,
  value: string,
  base = "/",
): string {
  const current = selectedIn(params, key);
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== key && k !== "job") qs.set(k, v);
  }
  if (next.length) qs.set(key, next.join(","));
  const out = qs.toString();
  return out ? `${base}?${out}#results` : `${base}#results`;
}

function selectJobHref(params: Params, id: number, base = "/"): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "job") next.set(k, v);
  }
  next.set("job", String(id));
  return `${base}?${next.toString()}#detail`;
}

/* --- Filters --------------------------------------------------------------- */

export const FILTER_GROUPS = [
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

/**
 * "Searching for:" — the filters currently applied, each removable.
 *
 * The dropdowns above say what you *can* narrow by; this says what you
 * *have*, so a filter set two scrolls ago is still visible and can be
 * dropped without hunting for the menu it came from.
 */
export function ActiveFilters({
  params,
  base = "/",
}: {
  params: Params;
  base?: string;
}) {
  const active: Array<{ key: string; value?: string; label: string }> = [];

  if (params.q) active.push({ key: "q", label: `"${params.q}"` });
  if (params.category) active.push({ key: "category", label: params.category });

  // One chip per selected value, not per group, so a group holding two
  // choices can have either of them dropped on its own.
  for (const group of FILTER_GROUPS) {
    for (const value of selectedIn(params, group.key)) {
      const option = group.options.find(([v]) => v === value);
      active.push({
        key: group.key,
        value,
        label: option?.[1] ?? value,
      });
    }
  }

  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-muted">Searching for:</span>

      {active.map((filter) => (
        <Link
          key={`${filter.key}:${filter.value ?? ""}`}
          href={
            filter.value
              ? toggleParam(params, filter.key, filter.value, base)
              : withParam(params, filter.key, undefined, base)
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-2.5 py-1 text-xs text-ink transition-colors hover:border-line-strong"
        >
          {filter.label}
          <Icon name="close" className="size-3 text-ink-subtle" />
          <span className="sr-only">Remove this filter</span>
        </Link>
      ))}

      {active.length > 1 ? (
        <Link
          href={base}
          className="ml-1 text-xs font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
        >
          Clear all
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
  base = "/",
  saved = false,
}: {
  job: Job;
  params: Params;
  selected: boolean;
  /** The route this card's links belong to. */
  base?: string;
  /** Whether this job is already on the seeker's saved list. */
  saved?: boolean;
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
        {/* relative z-10 keeps it above the title's stretched link, which
            covers the whole card. */}
        <span className="relative z-10 -mr-1 -mt-1">
          <SaveButton jobId={job.id} initialSaved={saved} compact />
        </span>
      </div>

      <h3 className="mt-2 text-[17px] font-semibold leading-snug text-ink-strong">
        <Link
          href={selectJobHref(params, job.id, base)}
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
/**
 * The working day drawn on a 24-hour scale, as the detail view shows it:
 * a ticked track, the shift filled between two handles, and the start and
 * end times labelled above them.
 *
 * Read-only — it reports the position's hours rather than collecting them,
 * so it is a figure with a caption, not a slider.
 */
function WorkingHours({ job }: { job: Job }) {
  const start = job.working_hours_start;
  const end = job.working_hours_end;
  if (start === null || end === null) return null;

  // A shift crossing midnight is drawn as two segments; one would run
  // backwards across the scale.
  const wraps = end <= start;
  const segments = wraps
    ? [
        { from: start, to: 24 },
        { from: 0, to: end },
      ]
    : [{ from: start, to: end }];

  const pct = (hour: number) => (hour / 24) * 100;
  const time = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h3 className="font-semibold text-ink-strong">
          Working hours ({job.timezone_label})
        </h3>
        <p className="flex items-center gap-4 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-brand-300" />
            {job.working_hours_count} hours
          </span>
          {wraps ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-brand-700" />
              Overnight
            </span>
          ) : null}
        </p>
      </div>

      {/* Room above the track for the two time labels. */}
      <figure className="mt-7">
        <div className="relative h-1.5 rounded-full bg-card-muted">
          {segments.map((segment) => (
            <div
              key={`${segment.from}-${segment.to}`}
              className="absolute inset-y-0 bg-brand-300"
              style={{
                left: `${pct(segment.from)}%`,
                width: `${pct(segment.to - segment.from)}%`,
              }}
            />
          ))}

          {/* Hour ticks, skipping the labelled three-hour marks. */}
          {Array.from({ length: 25 }, (_, hour) => hour).map((hour) =>
            hour % 3 === 0 ? null : (
              <span
                key={`tick-${hour}`}
                aria-hidden
                className="absolute top-full mt-1 h-1 w-px bg-line-strong"
                style={{ left: `${pct(hour)}%` }}
              />
            ),
          )}

          {[start, end].map((hour, index) => (
            <span
              key={`handle-${index}-${hour}`}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pct(hour)}%` }}
            >
              <span
                aria-hidden
                className="block size-3.5 rounded-full border-2 border-brand-700 bg-card"
              />
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-ink">
                {time(hour)}
              </span>
            </span>
          ))}
        </div>

        <div className="mt-2.5 flex justify-between text-[11px] text-ink-subtle">
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hour) => (
            <span key={hour}>{String(hour % 24).padStart(2, "0")}</span>
          ))}
        </div>

        <figcaption className="sr-only">
          Working hours {job.working_hours_label} ({job.timezone_label}),
          {job.working_hours_count} hours a day.
        </figcaption>
      </figure>
    </section>
  );
}

export function JobDetailPane({ job }: { job: Job }) {
  const skills = [...job.required_skills].sort(
    (a, b) => LEVEL_ORDER.indexOf(skillLevel(a)) - LEVEL_ORDER.indexOf(skillLevel(b)),
  );

  return (
    /*
     * min-h-0 on this column and on the scrolling body below: a flex child
     * defaults to min-height:auto, which refuses to shrink below its content.
     * Without it the pane grows past the viewport and the page scrolls
     * instead of the description.
     */
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-7 py-6">
        {/* No job ID here: it is an internal row number, not something a
            candidate quotes or searches for. */}
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink-strong">
          {job.title}
        </h2>

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

      {/* Prose is capped so the description stays readable on a wide pane. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6 [&>*]:max-w-3xl">
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
