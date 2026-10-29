"use client";

import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icon";

/**
 * Search job title or keyword, from anywhere in the portal.
 *
 * Signing in should not take the job board away: a candidate who is already
 * in their portal still wants to look for work without hunting for a link
 * back to it. This searches every open position and lands on the board.
 *
 * It hides itself on pages that search their own contents. Recommended Jobs
 * has a search above its results, and two boxes on one screen — one of them
 * scoped, one of them not — is a guessing game about which is which.
 */

// Recommended Jobs used to carry its own search box; the frame has none,
// so the shell bar is the only search and hiding it there left that
// page's header 4px shorter than every other one.
/* Every candidate frame draws the SearchBar, Saved Jobs included: its own
   in-page search box was something I added, not something the design asks
   for. Kept as a list because a page that genuinely owns its search still
   should not show two. */
const PAGES_WITH_THEIR_OWN_SEARCH: string[] = [];

export function ShellSearch() {
  const pathname = usePathname();
  if (PAGES_WITH_THEIR_OWN_SEARCH.includes(pathname)) return null;

  return (
    <form action="/" className="relative w-[556px] max-w-full">
      <label htmlFor="shell-search" className="sr-only">
        Search job title or keyword
      </label>
      <Icon
        name="search"
        className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-faint"
      />
      <input
        id="shell-search"
        type="search"
        name="q"
        placeholder="Search job title or keyword"
        className="w-full rounded-lg border border-line-strong bg-card py-[9px] pl-11 pr-3.5 text-base leading-6 text-ink shadow-xs placeholder:text-ink-faint focus:border-brand-500 focus:outline-none"
      />
    </form>
  );
}
