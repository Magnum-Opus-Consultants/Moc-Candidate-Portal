import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ApplicantTabs } from "@/components/applicant-tabs";
import { JobChips } from "@/components/job-cards";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Card,
  JOB_STATUS_TONE,
  StatusBadge,
} from "@/components/ui/primitives";
import { api, formatDate } from "@/lib/api";

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

  const { job, tabs } = result.data;

  return (
    <div className="space-y-6">
      <Link
        href="/manager/jobs"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <Icon name="chevron-right" className="size-3.5 rotate-180" />
        All jobs
      </Link>

      {/* Job details overview header. */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-ink-strong">
                {job.title}
              </h1>
              <StatusBadge
                label={job.status_label}
                tone={JOB_STATUS_TONE[job.status] ?? "grey"}
              />
            </div>
            <Link
              href={`/jobs/${job.id}`}
              className="mt-1 inline-flex items-center gap-1 text-sm text-brand-700"
            >
              <Icon name="expand" className="size-3.5" />
              View as a job seeker sees it
            </Link>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Icon name="building" className="mt-0.5 size-4 text-ink-subtle" />
              <div>
                <dt className="text-xs text-ink-subtle">Hiring company</dt>
                <dd className="font-medium text-ink">{job.company}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Icon name="calendar" className="mt-0.5 size-4 text-ink-subtle" />
              <div>
                <dt className="text-xs text-ink-subtle">Applications close</dt>
                <dd className="font-medium text-ink">{formatDate(job.closes_at)}</dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="mt-5">
          <JobChips job={job} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
          <Button variant="outline" size="sm">
            <Icon name="edit" className="size-3.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            Duplicate
          </Button>
          <Button variant="outline" size="sm">
            Preview
          </Button>
          {job.status === "closed" ? (
            <Button variant="success" size="sm">
              <Icon name="refresh" className="size-3.5" />
              Reopen job
            </Button>
          ) : (
            <Button variant="danger" size="sm">
              <Icon name="close" className="size-3.5" />
              Close job
            </Button>
          )}
          <span className="ml-auto text-xs text-ink-subtle">
            {job.applicant_count} total · {job.new_applicant_count} new
          </span>
        </div>
      </Card>

      <ApplicantTabs tabs={tabs} />
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
