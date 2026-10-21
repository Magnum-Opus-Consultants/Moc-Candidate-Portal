import { Suspense } from "react";
import { connection } from "next/server";

import {
  JobDetailPane,
  JobResultCard,
  type Params,
} from "@/components/job-board";
import { JobRow } from "@/components/job-cards";
import { BackendOffline, CardSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { Button, Card, SectionHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export const metadata = { title: "Saved Jobs" };

/** This page's own route, for the links the shared board helpers build. */
const BASE = "/portal/saved";

export default function SavedJobsPage({
  searchParams,
}: PageProps<"/portal/saved">) {
  return (
    <Suspense fallback={<SavedSkeleton />}>
      <SavedJobs searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Saved Jobs, in the same two-pane shape as the board and Recommended Jobs.
 *
 * It used to be a stack of thin rows that said only the title and when it
 * was saved, so comparing two saved roles meant opening each in turn — the
 * opposite of what saving them was for. The list and the detail pane are the
 * board's own components, so a saved job reads exactly like any other.
 */
async function SavedJobs({
  searchParams,
}: {
  searchParams: PageProps<"/portal/saved">["searchParams"];
}) {
  // Relative dates ('3 days ago') are true only at the moment they are
  // rendered, so this subtree is request-time rather than prerendered.
  await connection();
  const params = (await searchParams) as Params;

  const term = (params.q ?? "").trim();
  const [savedResult, viewedResult] = await Promise.all([
    api.candidateSaved(term ? `?search=${encodeURIComponent(term)}` : ""),
    api.candidateRecentlyViewed(),
  ]);

  if (!savedResult.ok) return <BackendOffline error={savedResult.error} />;

  const saved = savedResult.data.results;
  const viewed = viewedResult.ok ? viewedResult.data.results : [];

  // Default to the first saved job so the detail pane is never empty.
  const selected =
    saved.find((job) => String(job.id) === params.job) ?? saved[0] ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink-strong">
          Saved Jobs
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {saved.length === 0
            ? "Review and apply to your saved jobs."
            : `${saved.length} ${saved.length === 1 ? "role" : "roles"} kept for later. Pick one to read it beside the list.`}
        </p>
      </div>

      {/* Search sits above the results it searches, as on Recommended Jobs,
          rather than in the header where its scope is a guess. */}
      <form action={BASE} className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Search your saved jobs</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
          />
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search your saved jobs"
            className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-800"
        >
          Search
        </button>
      </form>

      {saved.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-medium text-ink-strong">
            {term ? "No saved job matches that search" : "Nothing saved yet"}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
            {term
              ? "Try a shorter search, or clear it to see everything you have saved."
              : "Use Save for later on any job and it will appear here, ready to apply when you are."}
          </p>
          <Button href={term ? BASE : "/"} size="sm" className="mt-5">
            {term ? "Clear search" : "Browse open positions"}
          </Button>
        </Card>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
          <ol className="space-y-3">
            {saved.map((job) => (
              <li key={job.id}>
                {/* Everything on this page is saved by definition. */}
                <JobResultCard
                  job={job}
                  params={params}
                  selected={selected?.id === job.id}
                  base={BASE}
                  saved
                />
              </li>
            ))}
          </ol>

          {selected ? (
            <div
              id="detail"
              className="sticky top-4 flex max-h-[calc(100dvh-2rem)] scroll-mt-4 flex-col overflow-hidden rounded-xl border border-line bg-card shadow-sm"
            >
              <JobDetailPane job={selected} />
            </div>
          ) : null}
        </div>
      )}

      {viewed.length > 0 ? (
        <section>
          <SectionHeading
            title="Recently viewed"
            subtext="The last 10 jobs you opened"
          />
          <div className="space-y-2">
            {viewed.map((job) => (
              <JobRow key={job.id} job={job} context="viewed" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SavedSkeleton() {
  return (
    <div className="space-y-5">
      <CardSkeleton className="h-14 rounded-xl" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <CardSkeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
        <CardSkeleton className="h-[70dvh] rounded-xl" />
      </div>
    </div>
  );
}
