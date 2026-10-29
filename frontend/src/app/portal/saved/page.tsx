import { Suspense } from "react";
import { connection } from "next/server";

import { type Params } from "@/components/job-board";
import { SavedJobRow } from "@/components/saved-job-row";
import { BackendOffline, CardSkeleton } from "@/components/states";
import { PortalFooter } from "@/components/portal-footer";
import { Button, Card, PageHeading } from "@/components/ui/primitives";
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
 * Saved Jobs (frame 11:4940): the heading, one panel of rows, and the
 * footer at the foot of the viewport.
 *
 * The frame has no search box of its own and no "Recently viewed" list -
 * the header's SearchBar is the search, and recently viewed lives in the
 * dashboard's Saved and Viewed Jobs section (11:4903). A ?q= in the query
 * string still filters the list, so any link carrying one keeps working.
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
  const savedResult = await api.candidateSaved(
    term ? `?search=${encodeURIComponent(term)}` : "",
  );

  if (!savedResult.ok) return <BackendOffline error={savedResult.error} />;

  const saved = savedResult.data.results;

  return (
    /* min-h-full so the footer can sit at the bottom of the viewport the way
       the frame places it, rather than riding up under a short list. */
    <div className="flex min-h-full flex-col">
      <div className="space-y-8">
        <PageHeading
          title="Saved Jobs"
          subtext="Review and apply to your saved jobs"
        />

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
          <ol className="overflow-hidden rounded-2xl bg-card shadow-xs">
            {saved.map((job) => (
              <SavedJobRow key={job.id} job={job} />
            ))}
          </ol>
        )}
      </div>

      <div className="mt-auto pt-8">
        <PortalFooter />
      </div>
    </div>
  );
}

function SavedSkeleton() {
  return (
    <div className="space-y-8">
      <CardSkeleton className="h-16 rounded-xl" />
      <CardSkeleton className="h-96 rounded-2xl" />
    </div>
  );
}
