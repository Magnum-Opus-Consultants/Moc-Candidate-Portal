import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ApplicantTabs } from "@/components/applicant-tabs";
import { JobAdminActions } from "@/components/job-admin-actions";
import {
  ApplicantStats,
  JobDetailHeader,
} from "@/components/job-detail-header";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Card,
} from "@/components/ui/primitives";
import { api } from "@/lib/api";

export default function ManagerJobPage({
  params,
}: PageProps<"/manager/jobs/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <JobOverview params={params} />
    </Suspense>
  );
}

async function JobOverview({
  params,
}: {
  params: PageProps<"/manager/jobs/[id]">["params"];
}) {
  const { id } = await params;

  // "new" is the create-job route; the form is Day 10 of the Development Plan.
  if (id === "new") return <NewJobPlaceholder />;

  const result = await api.managerJob(id);

  if (!result.ok) {
    if (result.error.startsWith("404")) notFound();
    return <BackendOffline error={result.error} />;
  }

  const { job, tabs, stats } = result.data;

  return (
    <div className="space-y-5">
      {/* Job details overview header. */}
      <JobDetailHeader job={job} />

      <ApplicantStats stats={stats} />

      <ApplicantTabs tabs={tabs} />

      {/* Housekeeping, below the candidates. The frame gives the top of the
          page to the posting's state and the people in it; editing, copying
          and deleting are neither, and at the top they competed with the
          status controls for the same glance. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" href={`/manager/jobs/${job.id}/edit`}>
          <Icon name="edit" className="size-3.5" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          href={`/manager/jobs/${job.id}/preview`}
        >
          <Icon name="expand" className="size-3.5" />
          Preview
        </Button>
        <JobAdminActions
          jobId={job.id}
          title={job.title}
          applicantCount={job.applicant_count}
        />
      </div>

    </div>
  );
}

function NewJobPlaceholder() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-8 text-center">
        <span
          aria-hidden
          className="mx-auto grid size-11 place-items-center rounded-full bg-brand-100 text-brand-700"
        >
          <Icon name="plus" className="size-5" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-ink-strong">
          Create a job posting
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
          The step-by-step create form, the generic posting template and the AI
          rewriting advice are Day 10 of the Development Plan. The posting data
          model and the statuses behind it are already in place.
        </p>
        <Button href="/manager/jobs" variant="outline" size="sm" className="mt-5">
          Back to all jobs
        </Button>
      </Card>
    </div>
  );
}
