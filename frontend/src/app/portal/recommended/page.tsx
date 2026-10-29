import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  FILTER_GROUPS,
  selectedIn,
  withParam,
  type Params,
} from "@/components/job-board";
import { RecommendedJobCard } from "@/components/job-cards";
import { BackendOffline, CardSkeleton } from "@/components/states";
import { PageHeading } from "@/components/ui/primitives";
import { PortalFooter } from "@/components/portal-footer";
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
 * Recommended Jobs, as a grid of cards.
 *
 * It used to be the public board's two-pane list-and-detail. The frame has a
 * grid instead, and the grid is the better fit for what this page is for:
 * the board is for hunting through everything, where a detail pane beside
 * the list saves a round trip per job, while this is a short, ranked
 * shortlist that a candidate skims to decide what is worth opening. Three
 * across shows a whole row of options at once instead of one job and a
 * column of titles.
 *
 * Each card therefore has to stand on its own, which is why it carries a
 * description excerpt, the match reasons and the closing date rather than
 * leaning on a pane that is no longer there.
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

  const {
    results: jobs,
    facets,
    count,
    ranked,
    has_more: hasMore,
  } = result.data;

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
    <div>
      {/* The frame leaves 32px between the heading and the grid, but only
          16 between the grid and the footer rule, so the footer sits
          outside the page's own rhythm rather than inside it. */}
      <div className="space-y-8">
        <PageHeading
          title="Recommended Jobs"
          subtext="Job opportunities matched to your skills, experience and career preferences"
        />

        {/*
        The frame goes straight from the heading to the cards: no search,
        no filter rail, no active-filter chips, no "x of y ranked" line.
        The query string still drives the request, so a link carrying
        ?q= or a facet keeps working - only the controls are gone.
      */}
        <div>
          <div>
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
              <ol className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {jobs.map((job) => (
                  <li key={job.id} className="h-full">
                    <RecommendedJobCard
                      job={job}
                      saved={savedIds.has(job.id)}
                      on="page"
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
                    ({(ranked - jobs.length).toLocaleString("en-ZA")} more
                    ranked)
                  </span>
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <PortalFooter />
      </div>
    </div>
  );
}

function RecommendedSkeleton() {
  return (
    <div className="space-y-4">
      <CardSkeleton className="h-16 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <CardSkeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
