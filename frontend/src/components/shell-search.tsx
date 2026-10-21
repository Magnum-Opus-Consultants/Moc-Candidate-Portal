"use client";

import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icon";

/**
 * Search all open positions, from anywhere in the portal.
 *
 * Signing in should not take the job board away: a candidate who is already
 * in their portal still wants to look for work without hunting for a link
 * back to it. This searches every open position and lands on the board.
 *
 * It hides itself on pages that search their own contents. Recommended Jobs
 * has a search above its results, and two boxes on one screen — one of them
 * scoped, one of them not — is a guessing game about which is which.
 */

const PAGES_WITH_THEIR_OWN_SEARCH = ["/portal/recommended", "/portal/saved"];

export function ShellSearch() {
  const pathname = usePathname();
  if (PAGES_WITH_THEIR_OWN_SEARCH.includes(pathname)) return null;

  return (
    <form action="/" className="relative max-w-sm flex-1">
      <label htmlFor="shell-search" className="sr-only">
        Search all open positions
      </label>
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
      />
      <input
        id="shell-search"
        type="search"
        name="q"
        placeholder="Search all open positions"
        className="w-full rounded-lg border border-line bg-canvas py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none"
      />
    </form>
  );
}
