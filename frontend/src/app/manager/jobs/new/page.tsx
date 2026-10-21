import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { JobCreateForm } from "@/components/job-create-form";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "New job",
  description: "Post a new position to the Magnum Opus Consultants job board.",
};

/**
 * Post a new job.
 *
 * The dropdown choices come from /api/options/ so the form can never offer a
 * value the database would reject. That fetch is runtime data, so it sits
 * inside the Suspense boundary.
 */
export default function NewJobPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <Link
        href="/manager/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink-strong"
      >
        <Icon name="chevron-right" className="size-4 rotate-180" />
        All jobs
      </Link>

      <PageHeading
        title="New job"
        subtext="Save it as a draft while you work on it, or publish it straight to the board."
      />

      <Suspense fallback={<PageSkeleton />}>
        <FormWithOptions />
      </Suspense>
    </div>
  );
}

async function FormWithOptions() {
  const options = await api.profileOptions();
  if (!options.ok) return <BackendOffline error={options.error} />;
  return <JobCreateForm options={options.data} />;
}
