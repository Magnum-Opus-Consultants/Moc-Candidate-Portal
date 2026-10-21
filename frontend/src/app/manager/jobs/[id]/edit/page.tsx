import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { JobCreateForm } from "@/components/job-create-form";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

type EditParams = { params: Promise<{ id: string }> };

/**
 * Edit a posting (Development Plan, Day 10).
 *
 * The same form as the create page, seeded from what is stored. A published
 * job updates on the board as soon as it is saved, because the public list
 * reads the same row.
 */
export default function EditJobPage({ params }: EditParams) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <Suspense fallback={<PageSkeleton />}>
        <EditForm params={params} />
      </Suspense>
    </div>
  );
}

async function EditForm({ params }: EditParams) {
  const { id } = await params;

  const [detail, options] = await Promise.all([
    api.managerJob(id),
    api.profileOptions(),
  ]);

  if (!detail.ok) {
    if (detail.error.startsWith("404")) notFound();
    return <BackendOffline error={detail.error} />;
  }
  if (!options.ok) return <BackendOffline error={options.error} />;

  const { job } = detail.data;

  return (
    <>
      <Link
        href={`/manager/jobs/${job.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink-strong"
      >
        <Icon name="chevron-right" className="size-4 rotate-180" />
        Back to {job.title}
      </Link>

      <PageHeading
        title={`Edit ${job.title}`}
        subtext="Changes to a published posting show on the board as soon as you save."
      />

      <JobCreateForm options={options.data} job={job} />
    </>
  );
}
