import Link from "next/link";

import { Logo } from "@/components/logo";
import { SearchSuggest } from "@/components/search-suggest";
import { Avatar, cn } from "@/components/ui/primitives";
import type { Params } from "@/components/job-board";
import type { AuthUser, JobCategory } from "@/lib/api";

/**
 * The landing page's masthead, hero and category grid.
 *
 * Signed out these lead with "Log in" and "Sign up"; signed in they hand the
 * visitor back to their own portal instead of asking them to sign in again.
 */

export function SiteHeader({ user }: { user: AuthUser | null }) {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-5">
        <Logo href="/" className="h-8" />

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            aria-current="page"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-strong"
          >
            Find jobs
          </Link>
          <a
            href="https://moc-pty.com"
            className="rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:text-ink-strong"
          >
            About MOC
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              {/*
                An account is identified by its avatar and name, never by a
                raw email address: a new account has no name yet, so the
                email would otherwise be printed across the masthead.
              */}
              <Link
                href={user.home}
                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-card-muted"
                title={user.email}
              >
                <Avatar initials={user.initials} size="sm" />
                <span className="hidden max-w-40 truncate text-sm text-ink sm:inline">
                  {accountLabel(user)}
                </span>
              </Link>
              <Link
                href={user.home}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-800"
              >
                {user.role === "hiring_manager" ? "Dashboard" : "My portal"}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="rounded-lg px-4 py-2 text-sm text-ink transition-colors hover:text-brand-700"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-800"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** A name if there is one, otherwise the part of the email before the @. */
function accountLabel(user: AuthUser): string {
  const name = user.name.trim();
  if (name && !name.includes("@")) return name;
  return user.email.split("@")[0];
}


export function Hero({ params }: { params: Params }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-card">
      {/*
        A soft brand wash rather than a flat white slab, so the hero reads as
        the top of the page instead of an empty band above the results.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-card"
      />

      <div className="mx-auto max-w-[1600px] px-5 py-16 sm:py-20">
        <h1 className="mx-auto max-w-3xl text-balance text-center text-[34px] font-semibold leading-[1.1] tracking-tight text-ink-strong sm:text-[44px]">
          Find your next career move
        </h1>

        <form action="/" className="mx-auto mt-9 max-w-[680px]">
          <SearchSuggest defaultValue={params.q ?? ""} />
        </form>
      </div>
    </section>
  );
}

export function RoleCategories({
  categories,
  params,
}: {
  categories: JobCategory[];
  params: Params;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-[1600px] px-5 py-12">
        <h2 className="text-xl font-semibold tracking-tight text-ink-strong">
          Role categories
        </h2>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.name}>
              <CategoryCard category={category} params={params} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CategoryCard({
  category,
  params,
}: {
  category: JobCategory;
  params: Params;
}) {
  const label = category.name.toLowerCase();

  // Nothing live to filter to, so the card is shown but not a link.
  if (category.coming_soon) {
    return (
      <div
        aria-disabled
        className="h-full rounded-xl border border-dashed border-line bg-card/60 p-5"
      >
        <p className="text-[15px] font-semibold text-ink-subtle">
          {category.name}
        </p>
        <p className="mt-1.5 text-xs text-ink-subtle">
          {label} jobs coming soon
        </p>
      </div>
    );
  }

  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  query.set("category", category.name);

  return (
    <Link
      href={`/?${query.toString()}#results`}
      className={cn(
        "group flex h-full flex-col rounded-xl border border-line bg-card p-5",
        "transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md",
        params.category === category.name && "border-brand-700 ring-1 ring-brand-700",
      )}
    >
      <p className="text-[15px] font-semibold text-ink-strong transition-colors group-hover:text-brand-700">
        {category.name}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {category.job_count.toLocaleString("en-ZA")}{" "}
          {category.job_count === 1 ? "job" : "jobs"} in {label}
        </p>
        {category.new_count > 0 ? (
          <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
            {category.new_count} new
          </span>
        ) : null}
      </div>
    </Link>
  );
}
