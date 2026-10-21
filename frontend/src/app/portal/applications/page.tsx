import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { StageHistory } from "@/components/application-stage";
import { BackendOffline, PageSkeleton } from "@/components/states";
import {
  APPLICATION_STATUS_TONE,
  Button,
  Card,
  PageHeading,
  StatusBadge,
  cn,
} from "@/components/ui/primitives";
import { api, formatDate, type Application } from "@/lib/api";

/**
 * The job seeker's applications.
 *
 * The Development Plan asks for the positions applied for with the date and
 * the status of each; the SOW adds monitoring the stage reached in the
 * recruitment process. So each row carries its pipeline position and its
 * status history, not just a badge.
 */
export default function ApplicationsPage({
  searchParams,
}: PageProps<"/portal/applications">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Applications searchParams={searchParams} />
    </Suspense>
  );
}

/** How many rows a page shows before "Show more". */
const PAGE = 15;

const TABS: Array<{ key: string; label: string }> = [
  { key: "active", label: "In progress" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "rejected", label: "Not successful" },
  { key: "all", label: "All" },
];

async function Applications({
  searchParams,
}: {
  searchParams: PageProps<"/portal/applications">["searchParams"];
}) {
  // Relative dates ('3 days ago') are true only at the moment they are
  // rendered, so this subtree is request-time rather than prerendered.
  await connection();
  const params = (await searchParams) as Record<string, string | undefined>;
  const active = params.status ?? "active";

  // "Show more" grows the page rather than stepping through it, so rows
  // already read stay on screen.
  const limit = Math.min(Number(params.show ?? PAGE) || PAGE, 100);
  const query = new URLSearchParams({ limit: String(limit) });
  if (active !== "all") query.set("status", active);

  const result = await api.candidateApplications(`?${query.toString()}`);
  if (!result.ok) return <BackendOffline error={result.error} />;

  const { results, counts, count, has_more: hasMore } = result.data;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Applications"
        subtext="Where each position you have applied for has reached."
        action={
          <Button href="/" variant="outline" size="sm">
            Browse open positions
          </Button>
        }
      />

      {/*
        The four stat tiles that used to sit here said the same thing as the
        tabs below — "In progress 4" twice over, and "Total" equal to "All".
        Two rows of the same numbers push the actual applications off the
        screen, so the tabs carry the counts on their own.

        Filter by stage. Counts are of everything, so the tabs do not jump.
      */}
      <div className="flex flex-wrap gap-1.5 border-b border-line pb-3">
        {TABS.map((tab) => {
          const count = counts[tab.key] ?? 0;
          const selected = active === tab.key;
          return (
            <Link
              key={tab.key}
              href={
                tab.key === "active"
                  ? "/portal/applications"
                  : `/portal/applications?status=${tab.key}`
              }
              aria-current={selected ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                selected
                  ? "border-brand-700 bg-brand-700 font-medium text-brand-ink"
                  : "border-line bg-card text-ink-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded px-1.5 text-xs font-semibold",
                  selected ? "bg-white/20" : "bg-card-muted text-ink-subtle",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {results.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-medium text-ink-strong">
            {active === "active"
              ? "Nothing in progress"
              : `No applications at ${TABS.find((t) => t.key === active)?.label.toLowerCase()}`}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
            {counts.all === 0
              ? "Apply for a position and you can follow its progress here."
              : "Try another stage, or see all of your applications."}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            {counts.all > 0 ? (
              <Button href="/portal/applications?status=all" variant="outline" size="sm">
                See all
              </Button>
            ) : null}
            <Button href="/" size="sm">
              Browse open positions
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <ol className="space-y-2.5">
            {results.map((application) => (
              <li key={application.id}>
                <ApplicationCard application={application} />
              </li>
            ))}
          </ol>

          {hasMore ? (
            <div className="mt-4 text-center">
              <Link
                href={`/portal/applications?${new URLSearchParams({
                  ...(active !== "all" ? { status: active } : {}),
                  show: String(limit + PAGE),
                }).toString()}`}
                scroll={false}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-card-muted"
              >
                Show more
                <span className="text-ink-subtle">
                  ({count - results.length} more)
                </span>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * One application, as a row rather than a panel.
 *
 * Every card used to carry the full five-step tracker and a "Sent with this
 * application" block listing the same three lines — profile, CV, supporting
 * documents — which is identical on every application a seeker has. Four of
 * them filled the screen; thirty would be unreadable. What differs between
 * rows is on the row; what is the same for all of them is one click away.
 */
function ApplicationCard({ application }: { application: Application }) {
  const { job, pipeline, stage_index, is_closed } = application;
  const steps = pipeline.length || 1;
  const reached = Math.max(stage_index + 1, 1);
  // Nothing comes next once an application is closed, or at the last stage.
  const next = is_closed ? null : (pipeline[stage_index + 1] ?? null);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-ink-strong">
            <Link href={`/jobs/${job.id}`} className="hover:text-brand-700">
              {job.title}
            </Link>
          </h2>
          <p className="mt-0.5 truncate text-sm text-ink-muted">
            {job.company}
            <span className="text-ink-subtle"> · </span>
            {job.employment_label}
            <span className="text-ink-subtle"> · </span>
            {job.work_setup_label}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-xs text-ink-subtle sm:inline">
            Applied {formatDate(application.applied_at)}
          </span>
          <StatusBadge
            label={application.status_label}
            tone={APPLICATION_STATUS_TONE[application.status] ?? "grey"}
          />
        </div>
      </div>

      {/*
        Where it is and what comes next. The five labelled steps and the
        "sent with this application" list were the same on every row and
        told a candidate nothing they could act on; these two facts are
        what they actually want to know.
      */}
      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
          role="img"
          aria-label={`Stage ${reached} of ${steps}: ${application.status_label}`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              is_closed ? "bg-status-grey" : "bg-brand-700",
            )}
            style={{ width: `${(reached / steps) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-xs text-ink-subtle">
          {reached} of {steps}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        <p className="text-ink-muted">
          <span className="text-ink-subtle">Now:</span>{" "}
          <span className="font-medium text-ink">
            {application.status_label}
          </span>
          {next ? (
            <>
              <span className="mx-2 text-ink-subtle">→</span>
              <span className="text-ink-subtle">Next:</span>{" "}
              <span className="font-medium text-ink">{next.label}</span>
            </>
          ) : (
            <span className="ml-2 text-ink-subtle">
              {is_closed ? "This application is closed." : "Final stage."}
            </span>
          )}
        </p>

        <Link
          href={`/jobs/${job.id}`}
          className="font-medium text-brand-700 hover:underline"
        >
          View the position
        </Link>
      </div>

      <StageHistory application={application} />
    </Card>
  );
}
