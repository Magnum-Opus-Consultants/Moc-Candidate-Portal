import { notFound } from "next/navigation";
import { Suspense } from "react";

import { JobDetailView } from "@/components/job-detail-view";
import { BackendOffline, CardSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/primitives";

import { api } from "@/lib/api";

type PreviewParams = { params: Promise<{ id: string }> };

/**
 * Preview a posting (Development Plan, Day 11).
 *
 * The candidate's own job page, rendered inside the hiring manager's layout
 * so the sidebar and the way back stay where they were. It uses the same
 * `JobDetailView` the public page does, so what the manager sees here cannot
 * drift from what a job seeker actually gets.
 *
 * Reads through the manager endpoint rather than the public one, because a
 * draft or private posting is not on the public list — previewing before
 * publishing is the point.
 */
export default function JobPreviewPage({ params }: PreviewParams) {
  return (
    <div className="space-y-5">
      <Suspense fallback={<CardSkeleton className="h-96" />}>
        <Preview params={params} />
      </Suspense>
    </div>
  );
}

async function Preview({ params }: PreviewParams) {
  const { id } = await params;
  const result = await api.managerJob(id);

  if (!result.ok) {
    if (result.error.startsWith("404")) notFound();
    return <BackendOffline error={result.error} />;
  }

  const { job } = result.data;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-300 bg-brand-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-brand-700">
            Preview — this is {job.title} as a job seeker sees it.
          </p>
          {job.status !== "active" ? (
            <p className="mt-0.5 text-xs text-ink-muted">
              It is {job.status_label.toLowerCase()}, so candidates cannot
              reach this page yet.
            </p>
          ) : null}
        </div>
        <Button href={`/manager/jobs/${job.id}`} variant="outline" size="sm">
          <Icon name="chevron-right" className="size-3.5 rotate-180" />
          Back to the posting
        </Button>
      </div>

      <JobDetailView job={job} readOnly />
    </>
  );
}
