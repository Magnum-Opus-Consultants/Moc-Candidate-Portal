import Link from "next/link";
import { Suspense } from "react";

import {
  FilterRail,
  JobDetailPane,
  JobResultCard,
  withParam,
  type Params,
} from "@/components/job-board";
import { Logo } from "@/components/logo";
import { BackendOffline, CardSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { Button, cn } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/**
 * The public job board.
 *
 * Per the SOW, anyone may browse open positions and open a job without an
 * account; signing in is only required to apply or save.
 */
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/*
        The masthead and search sit on white with one soft curve behind them,
        so the search pill lifts off the page the way a job board's does.
      */}
      <div className="relative isolate overflow-hidden bg-card">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-[12%] -top-[120%] -z-10 h-[260%] w-[78%] rounded-[50%] bg-brand-50"
        />

        <SiteHeader />

        <Suspense fallback={<SearchSkeleton />}>
          <SearchBar searchParams={searchParams} />
        </Suspense>
      </div>

      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-10">
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}

/*
 * Evaluated once when the module loads at build time rather than per render:
 * calling new Date() during a render is unstable and blocks prerendering.
 */
const COPYRIGHT_YEAR = new Date().getFullYear();

/* --- Chrome ---------------------------------------------------------------- */

function SiteHeader() {
  return (
    <header className="relative">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-8 px-4">
        <Logo href="/" className="h-8" />

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            aria-current="page"
            className="border-b-2 border-brand-700 px-2 pb-1 pt-1.5 text-sm font-medium text-ink-strong"
          >
            Find jobs
          </Link>
          <a
            href="https://moc-pty.com"
            className="rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:text-ink-strong"
          >
            About MOC
          </a>
          <a
            href="https://moc-pty.com"
            className="rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:text-ink-strong"
          >
            FAQs
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/portal/saved"
            aria-label="Saved jobs"
            className="hidden rounded-lg p-2.5 text-ink-muted transition-colors hover:bg-card-muted hover:text-ink-strong sm:block"
          >
            <Icon name="bookmark" className="size-5" />
          </Link>

          <span aria-hidden className="mx-2 hidden h-6 w-px bg-line sm:block" />

          <Link
            href="/manager"
            className="hidden px-2 text-sm text-ink-muted transition-colors hover:text-ink-strong lg:block"
          >
            Employers / Post a job
          </Link>
          <Link
            href="/portal"
            className="rounded-lg px-3 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
          >
            Sign in
          </Link>
          <Button href="/portal/profile" size="sm" className="ml-1">
            Create profile
          </Button>
        </div>
      </div>
    </header>
  );
}

/** The what/where search, as one pill. */
async function SearchBar({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const params = (await searchParams) as Params;

  return (
    <div className="relative px-4 pb-10 pt-6">
      <form
        action="/"
        className="mx-auto flex max-w-3xl flex-col gap-1 rounded-2xl border border-line-strong bg-card p-2 shadow-[0_2px_12px_rgba(5,75,112,0.10)] sm:flex-row sm:items-center sm:rounded-full"
      >
        {/*
          One field, not the usual what/where pair: these are MOC's own and
          offshored roles, so the town a posting is filed under is not how
          anyone searches. Work setup covers what actually varies, and it is
          a filter.
        */}
        <label className="flex flex-1 items-center gap-2.5 px-4">
          <Icon name="search" className="size-5 shrink-0 text-ink-muted" />
          <span className="sr-only">Job title, skill or company</span>
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Job title, skill or company"
            className="w-full bg-transparent py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
          />
        </label>

        {/* Keep any active filters when the search is re-submitted. */}
        {(["employment_type", "work_setup", "experience_level"] as const).map(
          (key) =>
            params[key] ? (
              <input key={key} type="hidden" name={key} value={params[key]} />
            ) : null,
        )}

        <button
          type="submit"
          className="shrink-0 rounded-full bg-brand-700 px-7 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brand-800"
        >
          Find jobs
        </button>
      </form>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo href={null} className="h-9" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
            We help businesses expand globally by matching them with South
            Africa&apos;s leading professionals.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink-strong">Job seekers</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li>
              <Link href="/" className="hover:text-brand-700">
                Browse open positions
              </Link>
            </li>
            <li>
              <Link href="/portal/profile" className="hover:text-brand-700">
                Create your profile
              </Link>
            </li>
            <li>
              <Link href="/portal/applications" className="hover:text-brand-700">
                Track your applications
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink-strong">Employers</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li>
              <Link href="/manager" className="hover:text-brand-700">
                Hiring manager portal
              </Link>
            </li>
            <li>
              <a href="https://moc-pty.com" className="hover:text-brand-700">
                Global Talent Solutions
              </a>
            </li>
            <li>
              <a href="https://moc-pty.com" className="hover:text-brand-700">
                Professional Consulting
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink-strong">Get in touch</h2>
          <address className="mt-3 space-y-2 text-sm not-italic leading-relaxed text-ink-muted">
            <p>
              318 The Hillside Building
              <br />
              Lynnwood, Pretoria, 0081
              <br />
              South Africa
            </p>
            <p>
              <a href="tel:+27767401777" className="hover:text-brand-700">
                +27 76 740 1777
              </a>
              <br />
              <a href="mailto:careers@moc-pty.com" className="hover:text-brand-700">
                careers@moc-pty.com
              </a>
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto max-w-[1320px] px-4 py-4 text-xs text-ink-subtle">
          © {COPYRIGHT_YEAR} Magnum Opus Consultants (Pty) Ltd. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}

/* --- Results --------------------------------------------------------------- */

async function Results({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const params = (await searchParams) as Params;

  const query = new URLSearchParams();
  if (params.q) query.set("search", params.q);
  for (const key of ["employment_type", "work_setup", "experience_level"]) {
    if (params[key]) query.set(key, params[key]!);
  }
  if (params.sort === "date") query.set("sort", "newest");

  const qs = query.toString();
  const result = await api.jobs(qs ? `?${qs}` : "");

  if (!result.ok) return <BackendOffline error={result.error} />;

  const jobs = result.data.results;
  // Default to the first result so the detail pane is never empty on load.
  const selected =
    jobs.find((job) => String(job.id) === params.job) ?? jobs[0] ?? null;

  // Any narrowing — a search term or a filter — switches the heading from the
  // default "Jobs for you" to a result count.
  const searched = Boolean(
    params.q ||
      params.employment_type ||
      params.work_setup ||
      params.experience_level,
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 py-4">
        <FilterRail params={params} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,460px)_1fr]">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3">
            <h1 className="text-xl font-semibold tracking-tight text-ink-strong">
              {searched ? (
                <>
                  {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
                  {params.q ? ` for ${params.q}` : ""}
                </>
              ) : (
                "Jobs for you"
              )}
            </h1>

            <div className="flex items-center gap-1 text-sm">
              <span className="text-ink-subtle">Sort by</span>
              {(
                [
                  ["relevance", "Relevance"],
                  ["date", "Date"],
                ] as const
              ).map(([value, label]) => (
                <Link
                  key={value}
                  href={withParam(
                    params,
                    "sort",
                    value === "relevance" ? undefined : value,
                  )}
                  className={cn(
                    "rounded px-2 py-1 transition-colors",
                    (params.sort ?? "relevance") === value
                      ? "font-semibold text-brand-700"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-xl border border-line bg-card p-12 text-center">
              <p className="font-medium text-ink-strong">
                No jobs match that search
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
                Try a broader job title, clear a filter, or create a profile and
                we will tell you when something opens up.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Button href="/" variant="outline" size="sm">
                  Clear search
                </Button>
                <Button href="/portal/profile" size="sm">
                  Create a profile
                </Button>
              </div>
            </div>
          ) : (
            <ol className="space-y-3">
              {jobs.map((job) => (
                <li key={job.id}>
                  <JobResultCard
                    job={job}
                    params={params}
                    selected={selected?.id === job.id}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>

        {selected ? (
          <div
            id="detail"
            className="sticky top-4 max-h-[calc(100dvh-2rem)] scroll-mt-4 overflow-hidden rounded-xl border border-line bg-card shadow-sm"
          >
            <JobDetailPane job={selected} />
          </div>
        ) : null}
      </div>
    </>
  );
}

/* --- Loading --------------------------------------------------------------- */

function SearchSkeleton() {
  return (
    <div className="relative px-4 pb-10 pt-6">
      <div className="mx-auto h-[68px] max-w-3xl animate-pulse rounded-full border border-line bg-card-muted" />
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <>
      <div className="flex gap-2 py-4">
        {[0, 1, 2].map((i) => (
          <CardSkeleton key={i} className="h-9 w-32 rounded-full" />
        ))}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,460px)_1fr]">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
        <CardSkeleton className="hidden h-[560px] rounded-xl lg:block" />
      </div>
    </>
  );
}
