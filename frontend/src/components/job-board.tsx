import Link from "next/link";

import { SaveButton, ShareButton } from "@/components/job-actions";
import { Icon } from "@/components/ui/icon";
import { Chip, cn } from "@/components/ui/primitives";
import { formatDate, relativeDays, type Job } from "@/lib/api";

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

export function JobDetailPane({ job }: { job: Job }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-7 py-6">
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink-strong">
          {job.title}
        </h2>

        <a
          href="https://moc-pty.com"
          className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
        >
          {job.company}
          <Icon name="external" className="size-3.5" />
        </a>

        <p className="mt-1 text-sm text-ink">
          {job.salary_label}
          <span className="text-ink-subtle"> · </span>
          {job.employment_label}
          <span className="text-ink-subtle"> · </span>
          {job.work_setup_label}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link
            href={`/jobs/${job.id}`}
            className="rounded-full bg-brand-700 px-7 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Apply now
          </Link>
          <SaveButton jobId={job.id} initialSaved={job.is_saved ?? false} />
          <ShareButton jobId={job.id} />
        </div>

        {/*
          Browsing is open to anyone; applying needs a profile. Saying so here
          means the sign-up on the next screen is expected rather than a wall.
        */}
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          Applying takes you through your MOC profile first. Upload a PDF CV and
          we fill in most of it for you.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-6">
        <section>
          <h3 className="text-lg font-semibold text-ink-strong">Job details</h3>
          <ul className="mt-4 space-y-3">
            {(
              [
                ["wallet", job.salary_label],
                ["clock", job.employment_label],
                ["pin", job.work_setup_label],
                ["users", `${job.experience_label} level`],
                ["calendar", `Applications close ${formatDate(job.closes_at)}`],
              ] as const
            ).map(([icon, value]) => (
              <li key={value} className="flex items-center gap-3 text-sm text-ink">
                <Icon name={icon} className="size-4 shrink-0 text-ink-subtle" />
                {value}
              </li>
            ))}
          </ul>
        </section>

        <hr className="my-6 border-line" />

        <section>
          <h3 className="text-lg font-semibold text-ink-strong">
            Full job description
          </h3>
          <p className="mt-3 leading-relaxed text-ink-muted">{job.description}</p>

          {job.required_skills.length > 0 ? (
            <>
              <h4 className="mt-6 font-semibold text-ink-strong">
                Skills and tools
              </h4>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {job.required_skills.map((skill) => (
                  <li key={skill}>
                    <Chip>{skill}</Chip>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <hr className="my-6 border-line" />

        <p className="text-xs leading-relaxed text-ink-subtle">
          Magnum Opus Consultants is the legal employer in South Africa. We
          handle onboarding, HR, payroll and compliance, so you work with an
          international team on a local contract.
        </p>

        <Link
          href={`/jobs/${job.id}`}
          className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
        >
          Open this job on its own page
          <Icon name="chevron-right" className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
