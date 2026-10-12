import Link from "next/link";
import { Suspense } from "react";

import { JobGridCard } from "@/components/job-cards";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  PageHeading,
  SectionHeading,
  StatCard,
} from "@/components/ui/primitives";
import { api, relativeDays } from "@/lib/api";

export default function ManagerDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const result = await api.managerDashboard();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const { stats, jobs, activity } = result.data;

  return (
    <div className="space-y-8">
      <PageHeading
        title="Dashboard"
        subtext="Your postings, applicants and what the team has been doing."
        action={
          <Button href="/manager/jobs/new" size="sm">
            <Icon name="plus" className="size-3.5" />
            New Job
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={stats.open_jobs} title="Open jobs" supporting="Live now" />
        <StatCard
          value={stats.draft_jobs}
          title="Drafts"
          supporting="Not yet published"
        />
        <StatCard
          value={stats.total_applicants}
          title="Total applicants"
          supporting="Across all postings"
        />
        <StatCard
          value={stats.new_applicants}
          title="New applicants"
          supporting="Not yet reviewed"
        />
      </div>

      <section>
        <SectionHeading
          title="Your jobs"
          action={
            <Link
              href="/manager/jobs"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-700"
            >
              View all jobs
              <Icon name="chevron-right" className="size-3.5" />
            </Link>
          }
        />
        {jobs.length === 0 ? (
          <EmptyState
            title="No postings yet"
            body="Create your first job posting to start receiving applications."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <JobGridCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          title="Recent activity"
          subtext="The last 50 actions across the portal"
        />
        {activity.length === 0 ? (
          <EmptyState title="Nothing has happened yet" />
        ) : (
          <Card className="divide-y divide-line">
            {activity.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar initials={entry.actor.initials} size="sm" />
                <p className="min-w-0 flex-1 truncate text-sm text-ink">
                  <span className="font-medium text-ink-strong">
                    {entry.actor.name}
                  </span>{" "}
                  {entry.verb}{" "}
                  <span className="font-medium text-ink-strong">{entry.target}</span>
                </p>
                <span className="shrink-0 text-xs text-ink-subtle">
                  {relativeDays(entry.created_at)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
