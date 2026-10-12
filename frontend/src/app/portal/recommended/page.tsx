import { Suspense } from "react";

import { RecommendedJobCard } from "@/components/job-cards";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { EmptyState, PageHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export default function RecommendedPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Recommended />
    </Suspense>
  );
}

async function Recommended() {
  const result = await api.candidateRecommended();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const jobs = result.data.results;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Recommended Jobs"
        subtext="Open positions ranked by how well they match your profile. Roles you have already applied for are left out."
      />

      {jobs.length === 0 ? (
        <EmptyState
          title="No recommendations yet"
          body="Complete more of your profile and the matching engine will have more to work with."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <RecommendedJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
