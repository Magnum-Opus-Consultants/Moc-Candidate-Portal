import Link from "next/link";
import { Suspense } from "react";

import { JobGrid } from "@/components/job-grid";
import { JobStatusFilter } from "@/components/job-status-filter";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  EmptyState,
  PageHeading,
  StatCard,
  cn,
} from "@/components/ui/primitives";
import { api } from "@/lib/api";

export default function ManagerJobsPage({
  searchParams,
}: PageProps<"/manager/jobs">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AllJobs searchParams={searchParams} />
    </Suspense>
  );
}

/** The status tabs, in the order a manager works through them. */
const STATUSES: Array<{ key: string; label: string }> = [
  { key: "all", label: "All job statuses" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "draft", label: "Drafts" },
  { key: "private", label: "Private" },
  { key: "closed", label: "Closed" },
];

async function AllJobs({
  searchParams,
}: {
  searchParams: PageProps<"/manager/jobs">["searchParams"];
}) {
  const params = (await searchParams) as Record<string, string | undefined>;
  const status = params.status ?? "all";
  const limit = Number(params.show ?? 24);

  const query = new URLSearchParams();
  if (status !== "all") query.set("status", status);
  if (params.search) query.set("search", params.search);
  if (params.sort) query.set("sort", params.sort);
  query.set("limit", String(Math.min(Math.max(limit, 1), 100)));

  // The applicant totals live on the manager dashboard, not the job list.
  const [result, overview] = await Promise.all([
    api.managerJobs(`?${query.toString()}`),
    api.managerDashboard(),
  ]);
  if (!result.ok) return <BackendOffline error={result.error} />;

  const { results: jobs, count, status_counts: counts, has_more: hasMore } =
    result.data;
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const applicants = overview.ok ? overview.data.stats : null;

  // "Active" is accepting applications; "open" is everything that is not
  // closed, which is what a manager means by a job still on the books.
  const active = counts.active ?? 0;
  const open = total - (counts.closed ?? 0);

  const view = params.view === "list" ? "list" : "grid";

  function href(next: Record<string, string | undefined>) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...next })) {
      if (v) qs.set(k, v);
    }
    const out = qs.toString();
    return out ? `/manager/jobs?${out}` : "/manager/jobs";
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="All jobs"
        subtext="Get an overview of your job vacancies, application activity and candidates requiring review"
        action={
          <Button href="/manager/jobs/new" size="sm">
            <Icon name="plus" className="size-3.5" />
            New Job
          </Button>
        }
      />

      {/* The overview row from the designs. Each tile leads to the list it
          counts — a number a manager cannot act on is decoration. */}
      <div className="grid gap-3 rounded-2xl bg-card-muted p-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href={href({ status: "active", show: undefined })}
          value={active.toLocaleString("en-ZA")}
          title="Active jobs"
          supporting="Accepting applications"
          tone="green"
          icon={<Icon name="archive" className="size-5" />}
        />
        <StatCard
          href={href({ status: undefined, show: undefined })}
          value={open.toLocaleString("en-ZA")}
          title="Open jobs"
          supporting="All statuses except closed"
          tone="teal"
          icon={<Icon name="grid" className="size-5" />}
        />
        <StatCard
          href="/manager/candidates"
          value={(applicants?.total_applicants ?? 0).toLocaleString("en-ZA")}
          title="Total applicants"
          supporting="Across all open jobs"
          tone="info"
          icon={<Icon name="users" className="size-5" />}
        />
        <StatCard
          href="/manager/candidates"
          value={(applicants?.new_applicants ?? 0).toLocaleString("en-ZA")}
          title="New applicants"
          supporting="To be reviewed"
          tone="yellow"
          icon={<Icon name="bell" className="size-5" />}
        />
      </div>

      <form action="/manager/jobs" className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-52 flex-1">
          <span className="sr-only">Search job title or keyword</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
          />
          <input
            type="search"
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="Search job title or keyword"
            className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none"
          />
        </label>
        {status !== "all" ? (
          <input type="hidden" name="status" value={status} />
        ) : null}
        <Button size="sm">Search</Button>

        <Link
          href={href({ status: "closed", show: undefined })}
          className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-card-muted"
        >
          View closed jobs
        </Link>

        {/* Grid reads better when scanning; list fits more on screen. */}
        {/* One status at a time, with its count, as the frame has it. */}
        <JobStatusFilter
          selected={status}
          options={STATUSES.map((tab) => ({
            value: tab.key,
            label: tab.label,
            count: tab.key === "all" ? total : (counts[tab.key] ?? 0),
            href: href({
              status: tab.key === "all" ? undefined : tab.key,
              show: undefined,
            }),
          }))}
        />

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-line bg-card p-0.5">
          {(
            [
              ["list", "list", "List view"],
              ["grid", "grid", "Grid view"],
            ] as const
          ).map(([value, icon, label]) => (
            <Link
              key={value}
              href={href({ view: value === "grid" ? undefined : value })}
              aria-current={view === value ? "true" : undefined}
              title={label}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                view === value
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-subtle hover:bg-card-muted hover:text-ink",
              )}
            >
              <Icon name={icon} className="size-4" />
              <span className="sr-only">{label}</span>
            </Link>
          ))}
        </div>
      </form>


      {jobs.length === 0 ? (
        <EmptyState
          title="Nothing here"
          body="No postings match this status and search."
        />
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            Showing {jobs.length} of {count.toLocaleString("en-ZA")}
          </p>

          <JobGrid jobs={jobs} view={view} />

          {hasMore ? (
            <div className="text-center">
              <Link
                href={href({ show: String(limit + 24) })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-card-muted"
              >
                Show more
                <span className="text-ink-subtle">
                  ({(count - jobs.length).toLocaleString("en-ZA")} more)
                </span>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
