import { Suspense } from "react";

import { JobRow } from "@/components/job-cards";
import { SavedJobRow } from "@/components/saved-job-row";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Button, Card, SectionHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export const metadata = { title: "Saved Jobs" };

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-strong">
          Saved Jobs
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Review and apply to your saved jobs
        </p>
      </div>

      {saved.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-medium text-ink-strong">Nothing saved yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
            Use Save for later on any job and it will appear here, ready to
            apply when you are.
          </p>
          <Button href="/" size="sm" className="mt-5">
            Browse open positions
          </Button>
        </Card>
      ) : (
        <ul className="space-y-3">
          {saved.map((job) => (
            <SavedJobRow key={job.id} job={job} />
          ))}
        </ul>
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
