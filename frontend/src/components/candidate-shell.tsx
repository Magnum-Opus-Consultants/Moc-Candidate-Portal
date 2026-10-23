import { Suspense, type ReactNode } from "react";

import { SidebarLayout } from "@/components/collapsible-sidebar";
import { IdleTimeout } from "@/components/idle-timeout";
import { LogoutButton } from "@/components/logout-button";
import { ShellSearch } from "@/components/shell-search";
import { NavLink } from "@/components/nav-link";
import { Icon, type IconName } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/**
 * The job seeker shell: white sidebar with a mint-teal active state.
 *
 * The navigation is fixed, so the frame needs no data and prerenders. Only the
 * header avatar depends on the API, and it sits in its own Suspense boundary.
 */

const NAV: Array<{
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
}> = [
  { href: "/portal", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/portal/applications", label: "Applications", icon: "applications" },
  {
    href: "/portal/recommended",
    label: "Recommended Jobs",
    icon: "recommended",
  },
  { href: "/portal/saved", label: "Saved Jobs", icon: "saved" },
  { href: "/portal/profile", label: "My Profile", icon: "profile" },
  { href: "/portal/settings", label: "Settings", icon: "settings" },
];

export function CandidateShell({
  children,
  avatar,
}: {
  children: ReactNode;
  avatar: ReactNode;
}) {
  return (
    <>
      {/* Every signed-in page sits inside this shell, so one mount
          covers the whole portal. */}
      <IdleTimeout />
      <SidebarLayout
        storageKey="moc:candidate-sidebar"
        sidebarClassName="border-r border-line bg-card"
        width="w-60"
        navClassName="gap-4"
        nav={
          <>
            {/* Suspended because it reads the path to decide whether the
              page it is on already has a search of its own. */}
            <Suspense fallback={<div className="h-9 max-w-sm flex-1" />}>
              <ShellSearch />
            </Suspense>
            <div className="flex-1" />

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
              >
                <span className="sr-only">Notifications</span>
                <Icon name="bell" />
              </button>
              {avatar}
            </div>
          </>
        }
        sidebar={
          <>
            <nav className="flex-1 space-y-0.5 px-3 pt-5">
              {NAV.map((item) => (
                <NavLink key={item.href} href={item.href} exact={item.exact}>
                  <Icon name={item.icon} />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-line p-3">
              <LogoutButton className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-card-muted hover:text-ink" />
            </div>
          </>
        }
      >
        {children}
      </SidebarLayout>
    </>
  );
}

/** The signed-in job seeker's avatar — suspended, since it needs the API. */
export async function CandidateAvatar() {
  const result = await api.candidateProfile();
  return (
    <Avatar initials={result.ok ? result.data.user.initials : "··"} size="sm" />
  );
}

export function AvatarSkeleton() {
  return (
    <div
      aria-hidden
      className="size-7 animate-pulse rounded-full bg-card-muted"
    />
  );
}
