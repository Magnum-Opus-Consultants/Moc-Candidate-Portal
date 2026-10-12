import Link from "next/link";
import { Suspense } from "react";

import { BackendOffline, PageSkeleton } from "@/components/states";
import {
  APPLICATION_STATUS_TONE,
  Card,
  EmptyState,
  PageHeading,
  StatusBadge,
} from "@/components/ui/primitives";
import { api, formatDate } from "@/lib/api";

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Applications />
    </Suspense>
  );
}

async function Applications() {
  const result = await api.candidateApplications();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const applications = result.data.results;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Applications"
        subtext={`${applications.length} ${applications.length === 1 ? "position" : "positions"} you have applied for`}
      />

      {applications.length === 0 ? (
        <EmptyState
          title="You have not applied for anything yet"
          body="Browse open positions and apply — they will show up here with their status."
        />
      ) : (
        <Card className="divide-y divide-line">
          {applications.map((application) => (
            <div
              key={application.id}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/jobs/${application.job.id}`}
                  className="font-medium text-ink-strong hover:text-brand-700"
                >
                  {application.job.title}
                </Link>
                <p className="text-xs text-ink-subtle">
                  {application.job.company} · {application.job.location}
                </p>
              </div>

              <span className="text-xs text-ink-subtle">
                Applied {formatDate(application.applied_at)}
              </span>

              <StatusBadge
                label={application.status_label}
                tone={APPLICATION_STATUS_TONE[application.status] ?? "grey"}
              />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
