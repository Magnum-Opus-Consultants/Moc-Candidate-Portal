import Link from "next/link";
import { Suspense } from "react";

import {
  SentWithApplication,
  StageHistory,
  StageTracker,
} from "@/components/application-stage";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import {
  APPLICATION_STATUS_TONE,
  Button,
  Card,
  PageHeading,
  StatCard,
  StatusBadge,
  cn,
} from "@/components/ui/primitives";
import { api, formatDate, relativeDays, type Application } from "@/lib/api";

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
  const params = (await searchParams) as Record<string, string | undefined>;
  const active = params.status ?? "active";

  const result = await api.candidateApplications(
    active === "all" ? "" : `?status=${active}`,
  );
  if (!result.ok) return <BackendOffline error={result.error} />;

  const { results, counts } = result.data;

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={counts.active ?? 0}
          title="In progress"
          supporting="Still being considered"
        />
        <StatCard
          value={counts.shortlisted ?? 0}
          title="Shortlisted"
          supporting="You made the cut"
        />
        <StatCard
          value={counts.interview ?? 0}
          title="At interview"
          supporting="Interview stage reached"
        />
        <StatCard
          value={counts.all ?? 0}
          title="Total applications"
          supporting="All time"
        />
      </div>

      {/* Filter by stage. Counts are of everything, so the tabs do not jump. */}
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
                  ? "border-brand-700 bg-brand-700 font-medium text-white"
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
        <ol className="space-y-3">
          {results.map((application) => (
            <li key={application.id}>
              <ApplicationCard application={application} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ApplicationCard({ application }: { application: Application }) {
  const { job } = application;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-ink-strong">
            <Link href={`/jobs/${job.id}`} className="hover:text-brand-700">
              {job.title}
            </Link>
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {job.company}
            <span className="text-ink-subtle"> · </span>
            {job.employment_label}
            <span className="text-ink-subtle"> · </span>
            {job.work_setup_label}
          </p>
        </div>

        <StatusBadge
          label={application.status_label}
          tone={APPLICATION_STATUS_TONE[application.status] ?? "grey"}
        />
      </div>

      <div className="mt-5">
        <StageTracker application={application} />
      </div>

      <SentWithApplication application={application} />

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-subtle">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="calendar" className="size-3.5" />
          Applied {formatDate(application.applied_at)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="clock" className="size-3.5" />
          Last update {relativeDays(application.updated_at).toLowerCase()}
        </span>
        <Link
          href={`/jobs/${job.id}`}
          className="ml-auto inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
        >
          View the position
          <Icon name="chevron-right" className="size-3" />
        </Link>
      </div>

      <StageHistory application={application} />
    </Card>
  );
}
