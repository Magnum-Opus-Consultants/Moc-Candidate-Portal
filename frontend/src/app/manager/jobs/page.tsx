import { Suspense } from "react";

import { ListControls } from "@/components/applicant-tabs";
import { JobGridCard } from "@/components/job-cards";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  EmptyState,
  PageHeading,
  SectionHeading,
} from "@/components/ui/primitives";
import { api } from "@/lib/api";

export default function ManagerJobsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AllJobs />
    </Suspense>
  );
}

async function AllJobs() {
  const result = await api.managerJobs();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const jobs = result.data.results;
  const groups = [
    { label: "Active", jobs: jobs.filter((j) => j.status === "active") },
    { label: "Paused", jobs: jobs.filter((j) => j.status === "paused") },
    { label: "Drafts", jobs: jobs.filter((j) => j.status === "draft") },
    { label: "Private", jobs: jobs.filter((j) => j.status === "private") },
    { label: "Closed", jobs: jobs.filter((j) => j.status === "closed") },
  ].filter((group) => group.jobs.length > 0);

  return (
    <div className="space-y-6">
      <PageHeading
        title="All jobs"
        subtext={`${jobs.length} postings including drafts and private roles`}
        action={
          <Button href="/manager/jobs/new" size="sm">
            <Icon name="plus" className="size-3.5" />
            New Job
          </Button>
        }
      />

      <ListControls
        placeholder="Search job title or keyword"
        trailing={
          <>
            <Button variant="outline" size="sm">
              View closed jobs
            </Button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink-muted transition-colors hover:border-line-strong"
            >
              All active statuses
              <Icon name="chevron-down" className="size-3.5" />
            </button>
          </>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState title="No postings yet" />
      ) : (
        groups.map((group) => (
          <section key={group.label}>
            <SectionHeading
              title={group.label}
              subtext={`${group.jobs.length} ${group.jobs.length === 1 ? "posting" : "postings"}`}
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.jobs.map((job) => (
                <JobGridCard key={job.id} job={job} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
