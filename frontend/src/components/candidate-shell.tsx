import type { ReactNode } from "react";

import { LogoMark } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
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

const NAV: Array<{ href: string; label: string; icon: IconName; exact?: boolean }> = [
  { href: "/portal", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/portal/applications", label: "Applications", icon: "applications" },
  { href: "/portal/recommended", label: "Recommended Jobs", icon: "recommended" },
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
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-card lg:flex">
        <div className="p-4">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-gradient-brand px-5 py-7 text-center">
            <LogoMark href="/portal" className="h-16" />
            <span className="text-xs font-medium uppercase tracking-wide text-brand-ink-muted">
              Careers Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
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
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-card/90 backdrop-blur">
          <div className="flex items-center gap-4 px-5 py-3">
            <label className="relative max-w-md flex-1">
              <span className="sr-only">Search job title or keyword</span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
              />
              <input
                type="search"
                placeholder="Search job title or keyword"
                className="w-full rounded-lg border border-line bg-canvas py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-700 focus:outline-none"
              />
            </label>

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
          </div>
        </header>

        <main className="flex-1 px-5 py-7">{children}</main>
      </div>
    </div>
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
  return <div aria-hidden className="size-7 animate-pulse rounded-full bg-card-muted" />;
}
