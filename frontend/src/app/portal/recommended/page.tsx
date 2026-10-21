import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { FilterRail } from "@/components/filter-rail";
import {
  ActiveFilters,
  FILTER_GROUPS,
  JobDetailPane,
  JobResultCard,
  selectedIn,
  toggleParam,
  withParam,
  type Params,
} from "@/components/job-board";
import { BackendOffline, CardSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { api } from "@/lib/api";

export const metadata = { title: "Recommended Jobs" };

/** This page's own route, for every link the shared board helpers build. */
const BASE = "/portal/recommended";

/** How many more cards "Show more" asks for. */
const PAGE = 20;

export default function RecommendedPage({
  searchParams,
}: PageProps<"/portal/recommended">) {
  return (
    <Suspense fallback={<RecommendedSkeleton />}>
      <Recommended searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Recommended Jobs, in the same two-pane shape as the public board.
 *
 * The list and the detail pane are the board's own components rather than a
 * second set: a candidate should not have to learn a different way of
 * reading a job because they reached it from the portal.
 */
async function Recommended({
  searchParams,
}: {
  searchParams: PageProps<"/portal/recommended">["searchParams"];
}) {
  // Relative dates ('3 days ago') are true only at the moment they are
  // rendered, so this subtree is request-time rather than prerendered.
  await connection();
  const params = (await searchParams) as Params;

  const query = new URLSearchParams();
  if (params.q) query.set("search", params.q);
  for (const key of [...FILTER_GROUPS.map((g) => g.key), "role_category"]) {
    const chosen = selectedIn(params, key);
    if (chosen.length) query.set(key, chosen.join(","));
  }
  // "Show more" grows the page rather than stepping through it, so the cards
  // already read stay on screen.
  const limit = Math.min(Number(params.show ?? PAGE) || PAGE, 100);
  query.set("limit", String(limit));

  const [result, savedResult] = await Promise.all([
    api.candidateRecommended(`?${query.toString()}`),
    api.candidateSaved(),
  ]);
  if (!result.ok) return <BackendOffline error={result.error} />;

  const savedIds = new Set(
    savedResult.ok ? savedResult.data.results.map((job) => job.id) : [],
  );

  const { results: jobs, facets, count, ranked, has_more: hasMore } = result.data;

  // Default to the first result so the detail pane is never empty on load.
  const selected =
    jobs.find((job) => String(job.id) === params.job) ?? jobs[0] ?? null;

  const disciplines = Object.keys(facets.role_category ?? {}).sort();
  const groups = [
    ...FILTER_GROUPS,
    {
      key: "role_category",
      label: "Discipline",
      options: disciplines.map((name) => [name, name] as const),
    },
  ];

  const narrowed =
    Boolean(params.q) ||
    groups.some((group) => selectedIn(params, group.key).length > 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink-strong">
          Recommended jobs
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Ranked against your profile by the matching engine. Best fit first.
        </p>
      </div>

      {/* Search sits above the results it searches, not off in the header. */}
      <form action={BASE} className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Search your recommended jobs</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
          />
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search your recommended jobs"
            className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        {/* The filters already chosen ride along, or searching would quietly
            throw them away. */}
        {groups.flatMap((group) =>
          selectedIn(params, group.key).length
            ? [
                <input
                  key={group.key}
                  type="hidden"
                  name={group.key}
                  value={selectedIn(params, group.key).join(",")}
                />,
              ]
            : [],
        )}

        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-800"
        >
          Search
        </button>
      </form>

      <div className="space-y-3">
        <FilterRail
          groups={groups}
          selected={Object.fromEntries(
            groups.map((group) => [group.key, selectedIn(params, group.key)]),
          )}
          facets={facets}
          hrefs={Object.fromEntries(
            groups.map((group) => [
              group.key,
              Object.fromEntries(
                group.options.map(([value]) => [
                  value,
                  toggleParam(params, group.key, value, BASE),
                ]),
              ),
            ]),
          )}
          clearHref={BASE}
        />
        <ActiveFilters params={params} base={BASE} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3">
            <h2 className="text-base font-semibold text-ink-strong">
              {narrowed
                ? `${jobs.length} of ${ranked.toLocaleString("en-ZA")} ranked`
                : "Your best matches"}
            </h2>
            {count > ranked ? (
              <span
                className="text-xs text-ink-subtle"
                title="Match scores are worked out per job, so the newest matches are ranked rather than every one. Narrow the filters to rank a different set."
              >
                from {count.toLocaleString("en-ZA")} matching openings
              </span>
            ) : null}
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-xl border border-line bg-card p-12 text-center">
              <p className="font-medium text-ink-strong">
                {narrowed
                  ? "Nothing matches those filters"
                  : "Nothing to recommend just yet"}
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
                {narrowed
                  ? "Try clearing a filter or searching for something broader."
                  : "Complete more of your profile and the matching will have more to work with."}
              </p>
              {narrowed ? (
                <Link
                  href={BASE}
                  className="mt-5 inline-flex items-center rounded-lg border border-line-strong bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-card-muted"
                >
                  Clear filters
                </Link>
              ) : null}
            </div>
          ) : (
            <ol className="space-y-3">
              {jobs.map((job) => (
                <li key={job.id}>
                  <JobResultCard
                    job={job}
                    params={params}
                    selected={selected?.id === job.id}
                    base={BASE}
                    saved={savedIds.has(job.id)}
                  />
                </li>
              ))}
            </ol>
          )}

          {hasMore ? (
            <div className="mt-4 text-center">
              <Link
                href={withParam(params, "show", String(limit + PAGE), BASE)}
                scroll={false}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-card-muted"
              >
                Show more
                <span className="text-ink-subtle">
                  ({(ranked - jobs.length).toLocaleString("en-ZA")} more ranked)
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
    </div>
  );
}

function RecommendedSkeleton() {
  return (
    <div className="space-y-4">
      <CardSkeleton className="h-16 rounded-xl" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
        <CardSkeleton className="h-[70dvh] rounded-xl" />
      </div>
    </div>
  );
}
