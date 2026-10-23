import { Suspense } from "react";
import { connection } from "next/server";

import { type Params } from "@/components/job-board";
import { SavedJobRow } from "@/components/saved-job-row";
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
 * Saved Jobs: one panel of rows, each with its own apply action.
 *
 * A saved list is a to-do list, and the question it answers is "which of
 * these have I not applied to yet". Rows answer that down a single column;
 * the two-pane board this replaced answered it one job at a time. Applying
 * happens on the row, because saving a job and then having to open it to
 * apply is the step the page exists to remove.
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold leading-[38px] tracking-tight text-ink-strong">
          Saved Jobs
        </h1>
        <p className="mt-1 text-base leading-6 text-ink-muted">
          Review and apply to your saved jobs
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
        <ol className="divide-y divide-line-soft overflow-hidden rounded-2xl bg-card shadow-xs">
          {saved.map((job) => (
            <SavedJobRow key={job.id} job={job} />
          ))}
        </ol>
      )}

      {viewed.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            title="Recently viewed"
            subtext="The last 10 jobs you opened"
          />
          {/* The same panel as the saved list above: two lists of jobs on
              one page styled two different ways reads as two components
              that happen to share a screen. */}
          <ol className="divide-y divide-line-soft overflow-hidden rounded-2xl bg-card shadow-xs">
            {viewed.map((job) => (
              <SavedJobRow key={job.id} job={job} when="viewed" />
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function SavedSkeleton() {
  return (
    <div className="space-y-5">
      <CardSkeleton className="h-14 rounded-xl" />
      <CardSkeleton className="h-72 rounded-xl" />
    </div>
  );
}
