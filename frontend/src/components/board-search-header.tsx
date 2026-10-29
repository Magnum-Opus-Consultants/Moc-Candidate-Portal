import Link from "next/link";

import { Logo } from "@/components/logo";
import { Icon } from "@/components/ui/icon";
import type { AuthUser } from "@/lib/api";

/**
 * The board's header once a search is running (frame 147:15482).
 *
 * The landing page leads with the hero and the role categories, which are
 * how you start looking. Once you have searched, the frame drops both: the
 * results are the page, and the search moves up into a 120px band with the
 * term still in it so the next search is one edit away rather than a scroll
 * back to the top.
 */

/** A badge on the "Searching for:" row (224:10011). */
function FilterChip({ label, clearHref }: { label: string; clearHref: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-2xl bg-canvas py-0.5 pl-2 pr-1.5 text-xs font-medium leading-[18px] text-ink-muted">
      {label}
      <Link
        href={clearHref}
        scroll={false}
        aria-label={`Remove ${label}`}
        className="rounded-full p-0.5 text-ink-faint transition-colors hover:bg-line hover:text-ink-strong"
      >
        <Icon name="close" className="size-3" />
      </Link>
    </span>
  );
}

export function BoardSearchHeader({
  term,
  chips,
  user,
  filtersHref,
  filtersOpen,
}: {
  /** What is in the box, so a refinement starts from the last search. */
  term: string;
  chips: Array<{ label: string; clearHref: string }>;
  user: AuthUser | null;
  /** Shows or hides the filter controls, which the frame keeps off-screen. */
  filtersHref: string;
  filtersOpen: boolean;
}) {
  return (
    <>
      <header className="h-[120px] bg-line">
        {/* Three tracks rather than a flex row: the frame centres the
            field on the page, which only holds if the logo and the
            actions take equal space either side of it. */}
        <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-8 px-20">
          <Logo href="/" className="h-10" />

          {/* h-14 rather than padding alone: the frame's field is 56px, and
              the 36px button inside it would otherwise drive it to 58. */}
          <form
            action="/"
            className="flex h-14 w-[668px] max-w-full items-center justify-between gap-2 rounded-lg border border-line-strong bg-card px-3.5 shadow-xs"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <Icon name="search" className="size-5 shrink-0 text-ink-faint" />
              <label htmlFor="board-search" className="sr-only">
                Job title or keyword
              </label>
              <input
                id="board-search"
                type="search"
                name="q"
                defaultValue={term}
                placeholder="Job title or keyword"
                className="min-w-0 flex-1 bg-transparent text-base leading-6 text-ink-strong placeholder:text-ink-faint focus:outline-none"
              />
            </span>
            {/* The frame shows no filter controls beside the results, so
                this is where they live. Enter still searches. */}
            <Link
              href={filtersHref}
              scroll={false}
              aria-expanded={filtersOpen}
              aria-label={filtersOpen ? "Hide filters" : "Show filters"}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-brand-secondary bg-brand-secondary text-brand-secondary-ink shadow-xs transition-colors hover:border-brand-secondary-hover hover:bg-brand-secondary-hover"
            >
              <Icon name="sliders" className="size-5" />
            </Link>
          </form>

          <div className="flex shrink-0 items-center justify-self-end gap-3">
            {user ? (
              <Link
                href="/portal"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-brand-secondary-100 bg-brand-secondary-100 px-[18px] text-base font-semibold leading-6 text-brand-800 shadow-xs transition-colors hover:border-brand-secondary-200 hover:bg-brand-secondary-200"
              >
                My portal
              </Link>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="inline-flex h-11 items-center justify-center rounded-lg px-[18px] text-base font-semibold leading-6 text-ink-subtle transition-colors hover:text-ink-strong"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-brand-secondary-100 bg-brand-secondary-100 px-[18px] text-base font-semibold leading-6 text-brand-800 shadow-xs transition-colors hover:border-brand-secondary-200 hover:bg-brand-secondary-200"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {chips.length > 0 ? (
        <div className="mx-auto w-full max-w-[1320px] px-5 pb-7 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs leading-[18px] text-ink-subtle">
              Searching for:
            </span>
            {chips.map((chip) => (
              <FilterChip key={chip.label} {...chip} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
