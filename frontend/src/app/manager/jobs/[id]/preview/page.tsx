import { notFound } from "next/navigation";
import { Suspense } from "react";

import { JobDetailView } from "@/components/job-detail-view";
import { PreviewAsPicker } from "@/components/preview-as-picker";
import { BackendOffline, CardSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { Button, MatchChip } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export const metadata = { title: "Preview posting" };

/**
 * Preview a posting (Development Plan, Day 11).
 *
 * Three things, which are one page with different amounts of "who":
 *
 * - a draft, before it is published — so the wording can be checked
 *   while it is still private;
 * - a published posting exactly as the public sees it;
 * - the posting as one named job seeker sees it, with their saved and
 *   applied state and their match.
 *
 * The last is the one that earns its keep. "Why has this candidate not
 * applied?" is answered by looking at what they would have seen: whether
 * they saved it and never came back, and what the matcher made of them
 * against this role.
 *
 * It renders the candidate's own JobDetailView, so what a manager checks
 * here cannot drift from what a job seeker is actually served.
 */
export default function JobPreviewPage({
  params,
  searchParams,
}: PageProps<"/manager/jobs/[id]/preview">) {
  return (
    <div className="space-y-5">
      <Suspense fallback={<CardSkeleton className="h-96" />}>
        <Preview params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Preview({
  params,
  searchParams,
}: {
  params: PageProps<"/manager/jobs/[id]/preview">["params"];
  searchParams: PageProps<"/manager/jobs/[id]/preview">["searchParams"];
}) {
  const { id } = await params;
  const query = (await searchParams) as { as?: string };
  const as = typeof query.as === "string" ? query.as : "";

  const result = await api.managerJobPreview(id, as || undefined);
  if (!result.ok) {
    if (result.error.startsWith("404")) notFound();
    return <BackendOffline error={result.error} />;
  }

  const { job, seekers } = result.data;
  const seeker = job.viewing_as;

  return (
    <>
      <div className="space-y-3 rounded-xl border border-brand-300 bg-brand-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-700">
              {seeker
                ? `Preview — ${job.title} as ${seeker.name} sees it.`
                : `Preview — ${job.title} as a job seeker sees it.`}
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

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-brand-200 pt-3">
          <PreviewAsPicker jobId={job.id} seekers={seekers} current={as} />

          {seeker ? (
            <>
              <State
                on={job.has_applied ?? false}
                yes="Has applied"
                no="Has not applied"
              />
              <State
                on={job.is_saved ?? false}
                yes="Saved it"
                no="Has not saved it"
              />
              {job.match ? (
                <span className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
                  <span>{job.match.score}% match</span>
                  {job.match.reasons.slice(0, 2).map((reason) => (
                    <MatchChip
                      key={reason.label}
                      label={reason.label}
                      level={reason.level}
                    />
                  ))}
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <JobDetailView job={job} readOnly />
    </>
  );
}

/** One yes/no fact about the seeker being viewed as. */
function State({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <Icon
        name={on ? "check" : "close"}
        className={on ? "size-3.5 text-status-green" : "size-3.5 text-ink-subtle"}
      />
      <span className={on ? "font-medium text-ink" : "text-ink-muted"}>
        {on ? yes : no}
      </span>
    </span>
  );
}
