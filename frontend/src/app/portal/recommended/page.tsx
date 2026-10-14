import Link from "next/link";
import { Suspense } from "react";

import { ApplyButton } from "@/components/job-actions";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { Card, cn } from "@/components/ui/primitives";
import {
  api,
  formatDate,
  relativeDays,
  type Job,
  type MatchReason,
} from "@/lib/api";

export const metadata = { title: "Recommended Jobs" };

export default function RecommendedPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Recommended />
    </Suspense>
  );
}

async function Recommended() {
  const [jobsResult, profileResult] = await Promise.all([
    api.candidateRecommended(),
    api.candidateProfile(),
  ]);

  if (!jobsResult.ok) return <BackendOffline error={jobsResult.error} />;

  const jobs = jobsResult.data.results;
  const profile = profileResult.ok ? profileResult.data : null;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-strong">
          Recommended jobs
        </h1>
      </div>

      {jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-medium text-ink-strong">
            Nothing to recommend just yet
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
            Complete more of your profile and the matching will have more to
            work with.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <RecommendedCard key={job.id} job={job} />
            ))}
          </div>

          <p className="text-center text-xs text-ink-subtle">
            We&apos;re constantly working to bring you more job options and
            selections, so make sure to check in regularly.
          </p>
        </>
      )}

      {profile && profile.completion < 100 ? (
        <CompletionPrompt completion={profile.completion} />
      ) : null}
    </div>
  );
}

/** Match reasons, coloured as the designs do: green, amber, red. */
function MatchChip({ reason }: { reason: MatchReason }) {
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-xs font-medium",
        reason.level === "match" && "bg-status-green-bg text-status-green",
        reason.level === "partial" && "bg-status-yellow-bg text-status-yellow",
        reason.level === "none" && "bg-status-rose-bg text-status-rose",
      )}
    >
      {reason.label}
    </span>
  );
}

function RecommendedCard({ job }: { job: Job }) {
  const reasons = job.match?.reasons ?? [];
  // Keep the card to two rows of chips; the rest collapse into a count.
  const shown = reasons.slice(0, 5);
  const extra = reasons.length - shown.length;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-ink-strong">
            <Link href={`/jobs/${job.id}`} className="hover:text-brand-700">
              {job.title}
            </Link>
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-subtle">
            <Icon name="clock" className="size-3.5 shrink-0" />
            Added {relativeDays(job.posted_at).toLowerCase()}
          </p>
        </div>
        <span className="shrink-0 text-ink-subtle">
          <Icon name="bookmark" />
        </span>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted">
        {job.description}
      </p>

      {shown.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {shown.map((reason) => (
            <MatchChip key={reason.label} reason={reason} />
          ))}
          {extra > 0 ? (
            <span className="rounded bg-status-yellow-bg px-2 py-0.5 text-xs font-medium text-status-yellow">
              +{extra} more
            </span>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-xs text-ink-subtle">
        Applications close {formatDate(job.closes_at)}
      </p>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
        <ApplyButton jobId={job.id} initialApplied={job.has_applied ?? false} />
        <Link
          href={`/jobs/${job.id}`}
          className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
        >
          View job details
          <Icon name="chevron-right" className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

/**
 * The prompt under the list. The designs word it by how far along the
 * profile is, so a nearly-complete profile is not told it is empty.
 */
function CompletionPrompt({ completion }: { completion: number }) {
  const message =
    completion < 40
      ? "Your profile is looking a bit empty right now"
      : completion < 80
        ? "You are well on your way — a bit more and we can match you better"
        : "Almost there. Finishing your profile sharpens your recommendations";

  return (
    <section className="rounded-2xl bg-gradient-brand px-6 py-8">
      <p className="text-center text-sm font-medium text-white">
        A more complete profile means that we can give more recommendations.
      </p>

      <div className="mx-auto mt-5 max-w-md rounded-xl bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-brand-700 transition-[width]"
              style={{ width: `${completion}%` }}
            />
          </div>
          <span className="text-sm font-medium text-ink">{completion}%</span>
        </div>

        <p className="mt-3 text-center text-sm text-ink-muted">{message}</p>

        <Link
          href="/portal/profile/complete"
          className="mt-4 block rounded-lg border border-line py-2.5 text-center text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-card-muted"
        >
          Complete profile
        </Link>
      </div>
    </section>
  );
}
