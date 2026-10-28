import { notFound } from "next/navigation";
import { Suspense } from "react";

import { JobDetailsClient } from "@/components/job-details-actions";
import type { QuickEditVariant } from "@/components/quick-edit";
import { BackendOffline, CardSkeleton } from "@/components/states";
import { api } from "@/lib/api";

export const metadata = { title: "Job details" };

type DetailsParams = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The hiring manager's job details page ("Option A – Job details").
 *
 * Separate from /manager/jobs/[id], which is the applicant list: the frame's
 * header reads "Back to applicants", so applicants is the parent and this is
 * the posting's own record. Keeping them apart means neither page has to
 * carry the other's load.
 */
export default function JobDetailsPage({ params, searchParams }: DetailsParams) {
  return (
    <Suspense fallback={<CardSkeleton className="h-96" />}>
      <Details params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Details({ params, searchParams }: DetailsParams) {
  const { id } = await params;
  const query = (await searchParams) as { quickEdit?: string };
  const variant: QuickEditVariant =
    query.quickEdit === "inline" || query.quickEdit === "floating"
      ? query.quickEdit
      : "drawer";
  const result = await api.managerJob(id);

  if (!result.ok) {
    if (result.error.startsWith("404")) notFound();
    return <BackendOffline error={result.error} />;
  }

  return <JobDetailsClient job={result.data.job} variant={variant} />;
}
