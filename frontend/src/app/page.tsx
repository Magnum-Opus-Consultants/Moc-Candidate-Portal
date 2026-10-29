import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { FilterRail } from "@/components/filter-rail";
import {
  ActiveFilters,
  FILTER_GROUPS,
  selectedIn,
  toggleParam,
  JobDetailPane,
  JobResultCard,
  withParam,
  type Params,
} from "@/components/job-board";
import { BoardSearchHeader } from "@/components/board-search-header";
import { LogoMark } from "@/components/logo";
import {
  Hero,
  RoleCategories,
  SiteHeader,
} from "@/components/landing";
import { BackendOffline, CardSkeleton } from "@/components/states";
import { Button, cn } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/*
 * Evaluated once when the module loads at build time rather than per
 * render: calling new Date() during a render is unstable and blocks
 * prerendering.
 */
const COPYRIGHT_YEAR = new Date().getFullYear();

/**
 * The public job board.
 *
 * Per the SOW, anyone may browse open positions and open a job without an
 * account; signing in is only required to apply or save.
 */
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* The frame has two states: the landing page leads with the hero and
          the role categories, and once a search is running they give way to
          a 120px band with the search in it (147:15482). */}
      <Suspense fallback={<HeaderSkeleton />}>
        <TopOfPage searchParams={searchParams} />
      </Suspense>

      <main
        id="results"
        className="mx-auto w-full max-w-[1320px] flex-1 scroll-mt-4 px-5 pb-12"
      >
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * Show or hide the filter controls. Built by hand rather than with
 * withParam, which drops `job` - that would close the detail pane every
 * time someone opened the filters.
 */
function filtersHref(params: Params): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "filters") next.set(k, v);
  }
  if (!params.filters) next.set("filters", "1");
  const qs = next.toString();
  return qs ? `/?${qs}` : "/";
}

/** Whether the visitor has searched or narrowed anything yet. */
function isSearching(params: Params): boolean {
  if (params.q) return true;
  return [...FILTER_GROUPS.map((g) => g.key), "role_category"].some(
    (key) => selectedIn(params, key).length > 0,
  );
}

/** One chip per thing being searched on, each able to drop itself. */
function searchChips(params: Params) {
  const chips: Array<{ label: string; clearHref: string }> = [];

  if (params.q) {
    chips.push({ label: `"${params.q}"`, clearHref: withParam(params, "q") });
  }

  const groups = [
    ...FILTER_GROUPS,
    { key: "role_category", label: "Discipline", options: [] as const },
  ];
  for (const group of groups) {
    for (const value of selectedIn(params, group.key)) {
      const option = (group.options as ReadonlyArray<readonly [string, string]>)
        .find(([v]) => v === value);
      chips.push({
        label: option ? option[1] : value,
        clearHref: toggleParam(params, group.key, value),
      });
    }
  }

  return chips;
}

/**
 * The masthead, and above the results either the hero and categories or the
 * search band. Both need to know whether anyone is signed in.
 */
async function TopOfPage({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const [params, me] = await Promise.all([
    searchParams as Promise<Params>,
    api.me(),
  ]);
  const user = me.ok ? me.data : null;

  if (isSearching(params)) {
    return (
      <BoardSearchHeader
        term={params.q ?? ""}
        chips={searchChips(params)}
        user={user}
        filtersHref={filtersHref(params)}
        filtersOpen={Boolean(params.filters)}
      />
    );
  }

  const categories = await api.jobCategories();
  return (
    <>
      <SiteHeader user={user} />
      <Hero params={params} />
      {categories.ok ? (
        <RoleCategories categories={categories.data.results} params={params} />
      ) : null}
    </>
  );
}

function HeaderSkeleton() {
  return <div className="h-16 border-b border-line bg-card" />;
}

function HeroSkeleton() {
  return (
    <div className="border-b border-line bg-card">
      <div className="mx-auto max-w-[1600px] px-5 py-14">
        <div className="mx-auto h-9 w-80 max-w-full animate-pulse rounded bg-card-muted" />
        <div className="mx-auto mt-8 h-12 max-w-[620px] animate-pulse rounded-lg bg-card-muted" />
      </div>
    </div>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-5 py-10">
      <div className="h-6 w-40 animate-pulse rounded bg-card-muted" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-xl bg-card" />
        ))}
      </div>
    </div>
  );
}


function SiteFooter() {
  return (
    <footer className="bg-gradient-brand">
      <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark href={null} className="h-10" />
            <span className="text-base font-semibold text-brand-ink">
              Magnum Opus Consultants
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-ink-muted">
            We help businesses expand globally by matching them with South
            Africa&apos;s leading professionals.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-brand-ink">Job seekers</h2>
          <ul className="mt-3 space-y-2 text-sm text-brand-ink-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-white">
                Browse open positions
              </Link>
            </li>
            <li>
              <Link
                href="/signup"
                className="transition-colors hover:text-white"
              >
                Create your profile
              </Link>
            </li>
            <li>
              <Link
                href="/portal/applications"
                className="transition-colors hover:text-white"
              >
                Track your applications
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-brand-ink">Employers</h2>
          <ul className="mt-3 space-y-2 text-sm text-brand-ink-muted">
            <li>
              <Link
                href="/manager"
                className="transition-colors hover:text-white"
              >
                Hiring manager portal
              </Link>
            </li>
            <li>
              <a
                href="https://moc-pty.com"
                className="transition-colors hover:text-white"
              >
                Global Talent Solutions
              </a>
            </li>
            <li>
              <a
                href="https://moc-pty.com"
                className="transition-colors hover:text-white"
              >
                Professional Consulting
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-brand-ink">Get in touch</h2>
          <address className="mt-3 space-y-2 text-sm not-italic leading-relaxed text-brand-ink-muted">
            <p>
              318 The Hillside Building
              <br />
              Lynnwood, Pretoria, 0081
              <br />
              South Africa
            </p>
            <p>
              <a
                href="tel:+27767401777"
                className="transition-colors hover:text-white"
              >
                +27 76 740 1777
              </a>
              <br />
              <a
                href="mailto:careers@moc-pty.com"
                className="transition-colors hover:text-white"
              >
                careers@moc-pty.com
              </a>
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-[1320px] px-4 py-4 text-xs text-brand-ink-muted">
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
  // Relative dates ('3 days ago') are true only at the moment they are
  // rendered, so this subtree is request-time rather than prerendered.
  await connection();
  const params = (await searchParams) as Params;

  const query = new URLSearchParams();
  if (params.q) query.set("search", params.q);
  // The category cards link with ?category=; the API calls it role_category.
  if (params.category) query.set("role_category", params.category);
  for (const key of ["employment_type", "work_setup", "experience_level"]) {
    if (params[key]) query.set(key, params[key]!);
  }
  if (params.sort) query.set("sort", params.sort);
  // "Show more" grows the page rather than stepping through pages, so the
  // results already read stay on screen.
  if (params.show) query.set("limit", params.show);

  const qs = query.toString();
  // The saved list comes back 401 for a visitor who is not signed in, which
  // is simply an empty set — the board is public.
  const [result, savedResult] = await Promise.all([
    api.jobs(qs ? `?${qs}` : ""),
    api.candidateSaved(),
  ]);

  if (!result.ok) return <BackendOffline error={result.error} />;

  const savedIds = new Set(
    savedResult.ok ? savedResult.data.results.map((job) => job.id) : [],
  );

  const { results: jobs, count, has_more: hasMore, limit } = result.data;
  // Default to the first result so the detail pane is never empty on load.
  const selected =
    jobs.find((job) => String(job.id) === params.job) ?? jobs[0] ?? null;

  // Any narrowing — a search term or a filter — switches the heading from the
  // default "Jobs for you" to a result count.
  const searched = Boolean(
    params.q ||
      params.category ||
      params.employment_type ||
      params.work_setup ||
      params.experience_level,
  );

  return (
    <>
      {/* The frame goes straight from the "Searching for:" chips to the
          cards: no filter controls on the page at all. They live behind
          the sliders button in the search field, which sets ?filters=1. */}
      {!isSearching(params) || params.filters ? (
        <div className="space-y-3 py-4">
          <FilterRail
            groups={FILTER_GROUPS}
            selected={Object.fromEntries(
              FILTER_GROUPS.map((g) => [g.key, selectedIn(params, g.key)]),
            )}
            facets={result.data.facets}
            hrefs={Object.fromEntries(
              FILTER_GROUPS.map((g) => [
                g.key,
                Object.fromEntries(
                  g.options.map(([value]) => [
                    value,
                    toggleParam(params, g.key, value),
                  ]),
                ),
              ]),
            )}
            clearHref={withParam(
              Object.fromEntries(
                Object.entries(params).filter(
                  ([k]) => !FILTER_GROUPS.some((g) => g.key === k),
                ),
              ),
              "_",
            )}
          />
          {/* The search band above already lists what is being searched
              on (147:15486), so this would be a second copy of it. */}
          {isSearching(params) ? null : <ActiveFilters params={params} />}
        </div>
      ) : null}

      <div className="grid items-start gap-8 lg:grid-cols-[416px_minmax(0,832px)] lg:justify-center">
        {/* min-w-0: a grid item defaults to min-width:auto and so refuses to
            shrink below its content. The sort row below cannot wrap, so
            without this the column is forced to its 392px intrinsic width
            and the whole page scrolls sideways on a phone. The lg track
            uses minmax(0,…) for the same reason. */}
        <div className="min-w-0">
          {isSearching(params) ? null : (
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3">
              <h1 className="text-xl font-semibold tracking-tight text-ink-strong">
                {searched ? (
                  <>
                    {count.toLocaleString("en-ZA")}{" "}
                    {count === 1 ? "job" : "jobs"}
                    {params.q ? ` for ${params.q}` : ""}
                  </>
                ) : (
                  "Jobs for you"
                )}
              </h1>

              <div className="flex flex-wrap items-center gap-1 text-sm">
                <span className="text-ink-subtle">Sort by</span>
                {(
                  [
                    ["relevance", "Relevance"],
                    ["newest", "Newest"],
                    ["oldest", "Oldest"],
                  ] as const
                ).map(([value, label]) => (
                  <Link
                    key={value}
                    href={withParam(
                      params,
                      "sort",
                      value === "relevance" ? undefined : value,
                    )}
                    scroll={false}
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
          )}

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
                <Button href="/signup" size="sm">
                  Create a profile
                </Button>
              </div>
            </div>
          ) : (
            <ol className="space-y-5">
              {jobs.map((job) => (
                <li key={job.id}>
                  <JobResultCard
                    job={job}
                    params={params}
                    selected={selected?.id === job.id}
                    saved={savedIds.has(job.id)}
                  />
                </li>
              ))}
            </ol>
          )}

          {hasMore ? (
            <div className="mt-4 text-center">
              <Link
                href={withParam(params, "show", String(limit + 20))}
                scroll={false}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-card-muted"
              >
                Show more
                <span className="text-ink-subtle">
                  ({(count - jobs.length).toLocaleString("en-ZA")} more)
                </span>
              </Link>
            </div>
          ) : null}
        </div>

        {selected ? (
          <div
            id="detail"
            className="sticky top-4 flex max-h-[calc(100dvh-2rem)] scroll-mt-4 flex-col overflow-hidden rounded-xl border border-line bg-card shadow-sm"
          >
            <JobDetailPane job={selected} />
          </div>
        ) : null}
      </div>
    </>
  );
}

/* --- Loading --------------------------------------------------------------- */

function ResultsSkeleton() {
  return (
    <>
      <div className="flex gap-2 py-4">
        {[0, 1, 2].map((i) => (
          <CardSkeleton key={i} className="h-9 w-32 rounded-full" />
        ))}
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[416px_minmax(0,832px)] lg:justify-center">
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
