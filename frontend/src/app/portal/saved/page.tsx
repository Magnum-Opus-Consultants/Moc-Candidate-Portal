import { Suspense } from "react";

import { JobRow } from "@/components/job-cards";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { EmptyState, PageHeading, SectionHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export default function SavedJobsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SavedJobs />
    </Suspense>
  );
}

async function SavedJobs() {
  const [savedResult, viewedResult] = await Promise.all([
    api.candidateSaved(),
    api.candidateRecentlyViewed(),
  ]);

  if (!savedResult.ok) return <BackendOffline error={savedResult.error} />;

  const saved = savedResult.data.results;
  const viewed = viewedResult.ok ? viewedResult.data.results : [];

  return (
    <div className="space-y-8">
      <PageHeading
        title="Saved Jobs"
        subtext="Roles you kept for later, newest first."
      />

      {saved.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          body="Use Save for later on any job and it will appear here."
        />
      ) : (
        <div className="space-y-2">
          {saved.map((job) => (
            <JobRow key={job.id} job={job} context="saved" />
          ))}
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
