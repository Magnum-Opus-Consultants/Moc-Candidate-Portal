import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { NavLink } from "@/components/nav-link";
import { Icon } from "@/components/ui/icon";
import { JOB_STATUS_TONE, cn } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/**
 * The hiring manager shell: deep navy sidebar listing open and closed postings.
 *
 * The collapsible sections use <details>, so they need no client state and the
 * whole sidebar can stay a server component inside one Suspense boundary.
 */

const DOT_CLASS: Record<string, string> = {
  green: "bg-status-green",
  orange: "bg-status-orange",
  purple: "bg-status-purple",
  grey: "bg-status-grey",
  info: "bg-status-info",
};

const TOP_NAV = [
  { href: "/manager", label: "Dashboard", exact: true },
  { href: "/manager/jobs", label: "Jobs" },
  { href: "/manager/candidates", label: "Candidates" },
  { href: "/manager/emails", label: "Emails" },
];

export function ManagerShell({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-brand-900 lg:flex">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-card/90 px-5 py-3 backdrop-blur">
          <nav className="flex items-center gap-1">
            {TOP_NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                variant="tab"
                exact={item.exact}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-5 py-7">{children}</main>
      </div>
    </div>
  );
}

function JobLinks({ jobs, emptyLabel }: { jobs: SidebarJob[]; emptyLabel: string }) {
  if (jobs.length === 0) {
    return <p className="px-3 py-2 text-xs text-brand-ink-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-0.5">
      {jobs.map((job) => {
        const tone = JOB_STATUS_TONE[job.status] ?? "grey";
        return (
          <li key={job.id}>
            <NavLink href={`/manager/jobs/${job.id}`} variant="navy">
              <span
                aria-hidden
                className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASS[tone])}
              />
              <span className="truncate">{job.title}</span>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

function Section({
  label,
  icon,
  children,
  open = true,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details open={open} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-brand-ink-muted transition-colors hover:text-brand-ink [&::-webkit-details-marker]:hidden">
        {icon}
        <span className="flex-1">{label}</span>
        <Icon
          name="chevron-down"
          className="size-4 transition-transform group-open:rotate-0 -rotate-90"
        />
      </summary>
      <div className="pb-2">{children}</div>
    </details>
  );
}

type SidebarJob = { id: number; title: string; status: string };

/** The navy sidebar's contents — suspended, since it needs the API. */
export async function ManagerSidebar() {
  const [dashboard, jobs] = await Promise.all([
    api.managerDashboard(),
    api.managerJobs(),
  ]);

  const user = dashboard.ok ? dashboard.data.user : null;
  const all: SidebarJob[] = jobs.ok
    ? jobs.data.results.map((job) => ({
        id: job.id,
        title: job.title,
        status: job.status,
      }))
    : [];

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-5">
        <LogoMark href="/manager" className="size-8" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">
            {user?.name ?? "Hiring manager"}
          </span>
          <span className="block text-xs text-brand-ink-muted">Hiring manager</span>
        </span>
      </div>

      <div className="space-y-2 px-3">
        <Link
          href="/manager/jobs/new"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800"
        >
          <Icon name="plus" />
          New Job
        </Link>
        <NavLink href="/manager/jobs" variant="navy" exact className="justify-center">
          View all jobs
        </NavLink>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-1">
        <Section label="Open Jobs">
          <div className="px-2 pb-2">
            <label className="relative block">
              <span className="sr-only">Search jobs</span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-brand-ink-muted"
              />
              <input
                type="search"
                placeholder="Search jobs"
                className="w-full rounded-md bg-brand-800 py-1.5 pl-8 pr-2 text-xs text-brand-ink placeholder:text-brand-ink-muted focus:outline-none focus:ring-1 focus:ring-brand-700"
              />
            </label>
          </div>
          <div className="px-2">
            <JobLinks
              jobs={all.filter((job) => job.status !== "closed")}
              emptyLabel="No open jobs yet"
            />
          </div>
        </Section>

        <Section
          label="Closed Jobs"
          icon={<Icon name="archive" className="size-4" />}
          open={false}
        >
          <div className="px-2">
            <JobLinks
              jobs={all.filter((job) => job.status === "closed")}
              emptyLabel="No closed jobs"
            />
          </div>
        </Section>
      </div>

      <div className="border-t border-brand-700 p-3">
        <LogoutButton className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-brand-ink-muted transition-colors hover:bg-brand-800 hover:text-brand-ink" />
      </div>
    </>
  );
}

export function ManagerSidebarSkeleton() {
  return (
    <div aria-hidden className="animate-pulse space-y-3 p-4">
      <div className="h-8 w-40 rounded-full bg-brand-800" />
      <div className="h-9 rounded-lg bg-brand-800" />
      <div className="h-9 rounded-lg bg-brand-800" />
      <div className="mt-6 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 rounded-md bg-brand-800" />
        ))}
      </div>
    </div>
  );
}
