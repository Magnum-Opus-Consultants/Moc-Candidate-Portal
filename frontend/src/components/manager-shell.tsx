import Link from "next/link";
import type { ReactNode } from "react";

import { SidebarLayout } from "@/components/collapsible-sidebar";
import { IdleTimeout } from "@/components/idle-timeout";
import { LogoutButton } from "@/components/logout-button";
import { NavLink } from "@/components/nav-link";
import { Icon, type IconName } from "@/components/ui/icon";
import { JOB_STATUS_TONE, cn } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/**
 * The hiring manager shell: the near-black rail from the frame, listing
 * open and closed postings.
 *
 * The sections inside use <details>, so the rail itself needs no client
 * state and stays a server component inside one Suspense boundary. Only
 * whether the rail is open lives on the client — see SidebarLayout.
 */

const DOT_CLASS: Record<string, string> = {
  green: "bg-status-green",
  orange: "bg-status-orange",
  purple: "bg-status-purple",
  grey: "bg-status-grey",
  info: "bg-status-info",
};

/**
 * Where a manager can go, in the rail.
 *
 * The approved job-detail frame has no bar across the top — everything is
 * in the dark rail — but the rail it draws only lists postings, so on its
 * own it cannot reach the dashboard, the candidates or the emails. Moving
 * those three into the rail honours the frame's shape without stranding
 * three pages behind a bar that is no longer there.
 *
 * "Jobs" is not among them: View all jobs, directly above, already is it.
 */
const SIDEBAR_NAV: Array<{ href: string; label: string; icon: IconName; exact?: boolean }> = [
  { href: "/manager", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/manager/candidates", label: "Candidates", icon: "users" },
  { href: "/manager/emails", label: "Emails", icon: "mail" },
];

export function ManagerShell({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <>
      <IdleTimeout />
      <SidebarLayout
        storageKey="moc:manager-sidebar"
        sidebar={sidebar}
        sidebarClassName="bg-sidebar"
        width="w-61"
        label="jobs sidebar"
        tone="dark"
      >
        {children}
      </SidebarLayout>
    </>
  );
}

function JobLinks({
  jobs,
  emptyLabel,
}: {
  jobs: SidebarJob[];
  emptyLabel: string;
}) {
  if (jobs.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-sidebar-ink-muted">{emptyLabel}</p>
    );
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
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 self-start rounded-full",
                  DOT_CLASS[tone],
                )}
              />
              <span className="break-words">{job.title}</span>
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
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium tracking-wide uppercase text-sidebar-ink-muted transition-colors hover:text-sidebar-ink [&::-webkit-details-marker]:hidden">
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

/** The rail's contents — suspended, since it needs the API. */
export async function ManagerSidebar() {
  const [dashboard, jobs] = await Promise.all([
    api.managerDashboard(),
    // The rail is a shortcut list, not the full index.
    api.managerJobs("?limit=25"),
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
      {/* The frame leads with the manager, not the logo: the masthead
          already carries the brand, and this rail is their workspace. */}
      <Link
        href="/manager"
        className="flex items-center gap-3 px-4 py-5 transition-opacity hover:opacity-90"
      >
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-semibold text-white"
        >
          {user?.initials ?? "HM"}
        </span>
        <span className="min-w-0 truncate text-[13px] font-semibold text-white">
          {user?.name ?? "Hiring manager"}
        </span>
      </Link>

      <div className="space-y-2 px-3">
        <Link
          href="/manager/jobs/new"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-sidebar-accent-hover"
        >
          <Icon name="plus" />
          New Job
        </Link>
        <Link
          href="/manager/jobs"
          className="flex w-full items-center justify-center rounded-lg bg-sidebar-surface px-3 py-2 text-[13px] font-medium text-sidebar-ink transition-colors hover:bg-sidebar-surface-hover"
        >
          View all jobs
        </Link>
      </div>

      <nav className="mt-3 space-y-0.5 px-3">
        {SIDEBAR_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            variant="navy"
            exact={item.exact}
          >
            <Icon name={item.icon} className="size-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-3 flex-1 overflow-y-auto px-1">
        <Section label="Open Jobs">
          {/* A real form. It had no form around it and no name, so typing
              in it and pressing Enter did nothing at all. */}
          <form
            action="/manager/jobs"
            className="flex items-center gap-1.5 px-2 pb-2"
          >
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Search jobs</span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-sidebar-ink-muted"
              />
              <input
                type="search"
                name="search"
                placeholder="Search jobs"
                className="w-full rounded-md bg-sidebar-hover py-1.5 pl-8 pr-2 text-xs text-sidebar-ink placeholder:text-sidebar-ink-muted focus:outline-none focus:ring-1 focus:ring-sidebar-accent"
              />
            </label>
            <Link
              href="/manager/jobs"
              title="Filter all jobs"
              className="shrink-0 rounded-md bg-sidebar-hover p-1.5 text-sidebar-ink-muted transition-colors hover:text-sidebar-ink"
            >
              <Icon name="filter" className="size-3.5" />
              <span className="sr-only">Filter all jobs</span>
            </Link>
          </form>
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

      <div className="border-t border-sidebar-line p-3">
        <LogoutButton className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-sidebar-ink-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-ink" />
      </div>
    </>
  );
}

export function ManagerSidebarSkeleton() {
  return (
    <div aria-hidden className="animate-pulse space-y-3 p-4">
      <div className="h-8 w-40 rounded-full bg-sidebar-hover" />
      <div className="h-9 rounded-lg bg-sidebar-hover" />
      <div className="h-9 rounded-lg bg-sidebar-hover" />
      <div className="mt-6 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 rounded-md bg-sidebar-hover" />
        ))}
      </div>
    </div>
  );
}
