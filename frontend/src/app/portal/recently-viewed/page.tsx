import { Suspense } from "react";
import { connection } from "next/server";

import { SavedJobRow } from "@/components/saved-job-row";
import { BackendOffline, CardSkeleton } from "@/components/states";
import { PortalFooter } from "@/components/portal-footer";
import { Button, Card, PageHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export const metadata = { title: "Recently Viewed" };

export default function RecentlyViewedPage() {
  return (
    <Suspense fallback={<RecentlyViewedSkeleton />}>
      <RecentlyViewed />
    </Suspense>
  );
}

/**
 * Recently Viewed (frame 11:4952): the last jobs this seeker opened, newest
 * first, in the same row list as Saved Jobs.
 *
 * It shares SavedJobRow with Saved Jobs deliberately - the frames are the
 * same component with a different verb in the timestamp, so a copy here
 * would drift out of step the first time either one is touched. The only
 * thing this page sees more of is the closed state: a saved list is mostly
 * live postings, while a viewing history naturally accumulates ones that
 * have since closed.
 */
async function RecentlyViewed() {
  // Relative dates ('3 days ago') are true only at the moment they are
  // rendered, so this subtree is request-time rather than prerendered.
  await connection();

  const result = await api.candidateRecentlyViewed();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const viewed = result.data.results;

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-8">
        <PageHeading
          title="Recently Viewed"
          subtext="See your recently viewed jobs"
        />

        {viewed.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="font-medium text-ink-strong">Nothing viewed yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
              Open a job and it will appear here, so you can find your way back
              to it without searching again.
            </p>
            <Button href="/portal/recommended" size="sm" className="mt-5">
              See recommended jobs
            </Button>
          </Card>
        ) : (
          <ol className="overflow-hidden rounded-2xl bg-card shadow-xs">
            {viewed.map((job) => (
              <SavedJobRow key={job.id} job={job} when="viewed" />
            ))}
          </ol>
        )}
      </div>

      {/* The frame leaves 48px between the list and the footer rule. */}
      <div className="mt-auto pt-12">
        <PortalFooter />
      </div>
    </div>
  );
}

function RecentlyViewedSkeleton() {
  return (
    <div className="space-y-8">
      <CardSkeleton className="h-16 rounded-xl" />
      <CardSkeleton className="h-[760px] rounded-2xl" />
    </div>
  );
}
