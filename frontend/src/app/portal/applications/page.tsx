import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { StageHistory } from "@/components/application-stage";
import { PortalFooter } from "@/components/portal-footer";
import { Icon } from "@/components/ui/icon";
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

/*
 * The frame has no stage filter on this page - it is a list of the
 * applications still in progress, which is what the title says. The tabs
 * that used to sit here (In progress / Shortlisted / Interview / Offer /
 * Not successful / All) are gone with it. ?status= still works if a link
 * carries one, so nothing that already points here breaks.
 */


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
    <div className="space-y-8">
      <PageHeading
        title="Active Applications"
        subtext="Track your active applications and their statuses"
      />

      {results.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-medium text-ink-strong">
            {active === "active"
              ? "Nothing in progress"
              : "No applications at this stage"}
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
          <ol className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-xs">
            {results.map((application, index) => (
              <li
                key={application.id}
                className={cn(
                  index < results.length - 1 && "border-b border-line-soft",
                )}
              >
                <ApplicationRow application={application} />
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
      <PortalFooter />
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
/**
 * One application, as frame 11:4921 draws it: the title, then the status,
 * the closing date, the date applied and the way in - all on one line.
 *
 * The card this replaced carried a pipeline bar and a "what happens next"
 * line per application. Useful, but it made each row six lines tall, so
 * five applications filled the screen. The stage is in the badge; the
 * detail is one click away.
 */
function ApplicationRow({ application }: { application: Application }) {
  const { job } = application;

  return (
    <div className="flex items-center px-6 py-3.5">
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4 py-2">
        <Link
          href={`/jobs/${job.id}`}
          className="min-w-0 truncate text-base font-semibold leading-6 text-ink-body hover:text-brand-700"
        >
          {job.title}
        </Link>

        <div className="flex shrink-0 items-center justify-end gap-10">
          <StatusBadge
            label={application.status_label}
            tone={APPLICATION_STATUS_TONE[application.status] ?? "grey"}
          />

          {job.closes_at ? (
            <span className="hidden items-center gap-2 text-base leading-6 text-ink-subtle xl:flex">
              <Icon name="alert-circle" className="size-5 shrink-0" />
              {formatDate(job.closes_at)}
            </span>
          ) : null}

          <span className="hidden items-center gap-2 text-base leading-6 text-ink-subtle lg:flex">
            <Icon name="calendar-check" className="size-5 shrink-0" />
            {formatDate(application.applied_at)}
          </span>

          <Link
            href={`/jobs/${job.id}`}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold leading-5 text-brand-700"
          >
            View job details
            <Icon name="chevron-right" className="size-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
