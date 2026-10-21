import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { FilterRail } from "@/components/filter-rail";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import {
  Avatar,
  Card,
  Chip,
  EmptyState,
  PROFILE_STRENGTH,
  PageHeading,
  StatusBadge,
  cn,
} from "@/components/ui/primitives";
import { api, skillName, type ProfileOptions } from "@/lib/api";

/** This page's route, for every link the filters build. */
const BASE = "/manager/candidates";

/** How many rows a page shows before "Show more". */
const PAGE = 20;

/**
 * The filter groups, and where each one's options come from.
 *
 * Drawn from /api/options/ rather than hardcoded, so a manager can never be
 * offered a value the database would reject.
 */
const GROUPS: Array<{ key: string; label: string; from: keyof ProfileOptions }> =
  [
    { key: "experience_level", label: "Experience", from: "experience_level" },
    { key: "role_category", label: "Discipline", from: "role_categories" },
    { key: "work_setup", label: "Work setup", from: "work_setup" },
    { key: "availability", label: "Availability", from: "availability" },
    {
      key: "employment_status",
      label: "Employment status",
      from: "employment_status",
    },
    { key: "education", label: "Education", from: "education_level" },
  ];

const SORTS: Array<[string, string]> = [
  ["newest", "Newest"],
  ["activity", "Recently active"],
  ["name", "Name"],
];

type Params = Record<string, string | undefined>;

export default function CandidateDatabasePage({
  searchParams,
}: PageProps<"/manager/candidates">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CandidateDatabase searchParams={searchParams} />
    </Suspense>
  );
}

/** The values chosen in one group. */
function selectedIn(params: Params, key: string): string[] {
  return (params[key] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function CandidateDatabase({
  searchParams,
}: {
  searchParams: PageProps<"/manager/candidates">["searchParams"];
}) {
  // Relative dates ('3 days ago') are true only at the moment they are
  // rendered, so this subtree is request-time rather than prerendered.
  await connection();

  const params = (await searchParams) as Params;

  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.sort) query.set("sort", params.sort);
  if (params.open_only) query.set("open_only", "1");
  for (const group of GROUPS) {
    const chosen = selectedIn(params, group.key);
    if (chosen.length) query.set(group.key, chosen.join(","));
  }
  // "Show more" grows the page rather than stepping through it, so rows
  // already read stay on screen.
  const limit = Math.min(Number(params.show ?? PAGE) || PAGE, 100);
  query.set("limit", String(limit));

  const [result, optionsResult] = await Promise.all([
    api.managerCandidates(`?${query.toString()}`),
    api.profileOptions(),
  ]);
  if (!result.ok) return <BackendOffline error={result.error} />;

  const { results: candidates, facets, count, has_more: hasMore } = result.data;
  const options = optionsResult.ok ? optionsResult.data : null;

  /** A link to this page with some parameters changed. */
  function href(next: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, ...next })) {
      if (value) qs.set(key, value);
    }
    const out = qs.toString();
    return out ? `${BASE}?${out}` : BASE;
  }

  /** Add or remove one value from a group. */
  function toggle(key: string, value: string): string | undefined {
    const current = selectedIn(params, key);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    return next.length ? next.join(",") : undefined;
  }

  // Only the options a candidate actually holds, so a group never offers a
  // choice that would empty the list.
  const groups = GROUPS.map((group) => {
    const counts = facets[group.key] ?? {};
    const all = options?.[group.from] ?? [];
    const known = new Set(all.map((option) => option.value));
    const extras = Object.keys(counts).filter((value) => !known.has(value));

    return {
      key: group.key,
      label: group.label,
      options: [
        ...all
          .filter((option) => counts[option.value])
          .map((option) => [option.value, option.label] as const),
        ...extras.map((value) => [value, value] as const),
      ],
    };
  }).filter((group) => group.options.length > 0);

  const narrowed =
    Boolean(params.search) ||
    Boolean(params.open_only) ||
    groups.some((group) => selectedIn(params, group.key).length > 0);

  const sort = params.sort ?? "newest";
  const openOnly = Boolean(params.open_only);

  return (
    <div className="space-y-5">
      <PageHeading
        title="Candidate database"
        subtext="Search and narrow everyone who has a profile on the portal."
      />

      {/* Search sits above the results it searches. */}
      <form action={BASE} className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">
            Search by name, email, skill or keyword
          </span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
          />
          <input
            type="search"
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="Search by name, email, skill or keyword"
            className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        {/* The filters already chosen ride along, or searching would quietly
            throw them away. */}
        {groups.flatMap((group) =>
          selectedIn(params, group.key).length
            ? [
                <input
                  key={group.key}
                  type="hidden"
                  name={group.key}
                  value={selectedIn(params, group.key).join(",")}
                />,
              ]
            : [],
        )}
        {openOnly ? (
          <input type="hidden" name="open_only" value="1" />
        ) : null}
        {params.sort ? (
          <input type="hidden" name="sort" value={params.sort} />
        ) : null}

        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-800"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <FilterRail
          groups={groups}
          selected={Object.fromEntries(
            groups.map((group) => [group.key, selectedIn(params, group.key)]),
          )}
          facets={facets}
          hrefs={Object.fromEntries(
            groups.map((group) => [
              group.key,
              Object.fromEntries(
                group.options.map(([value]) => [
                  value,
                  href({ [group.key]: toggle(group.key, value), show: undefined }),
                ]),
              ),
            ]),
          )}
          clearHref={BASE}
        />

        {/* Someone not looking for work is rarely worth approaching. */}
        <Link
          href={href({ open_only: openOnly ? undefined : "1", show: undefined })}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
            openOnly
              ? "border-brand-700 bg-brand-700 font-medium text-brand-ink"
              : "border-line-strong bg-card text-ink hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
          )}
        >
          {openOnly ? <Icon name="check" className="size-3" /> : null}
          Open to opportunities
        </Link>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">
            {count.toLocaleString("en-ZA")}
          </span>{" "}
          {count === 1 ? "candidate" : "candidates"}
          {narrowed ? " match" : " on the portal"}
        </p>

        <div className="flex items-center gap-1 text-sm">
          <span className="text-ink-subtle">Sort by</span>
          {SORTS.map(([value, label]) => (
            <Link
              key={value}
              href={href({
                sort: value === "newest" ? undefined : value,
                show: undefined,
              })}
              className={cn(
                "rounded px-2 py-1 transition-colors",
                sort === value
                  ? "font-semibold text-brand-700"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {candidates.length === 0 ? (
        <EmptyState
          title={narrowed ? "No candidate matches that" : "No candidates yet"}
          body={
            narrowed
              ? "Try clearing a filter or searching for something broader."
              : "Candidates appear here once they create a profile."
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {candidates.map((candidate) => {
              const strength =
                PROFILE_STRENGTH[candidate.strength] ??
                PROFILE_STRENGTH.getting_started;
              return (
                <Card
                  key={candidate.id}
                  className="flex flex-wrap items-center gap-4 px-4 py-3.5"
                >
                  <Avatar initials={candidate.user.initials} />

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/manager/candidates/${candidate.user.id}`}
                      className="font-medium text-ink-strong hover:text-brand-700"
                    >
                      {candidate.user.name}
                    </Link>
                    <p className="truncate text-xs text-ink-subtle">
                      {candidate.headline}
                      {candidate.location ? ` · ${candidate.location}` : ""}
                    </p>
                  </div>

                  <div className="hidden flex-wrap gap-1.5 lg:flex">
                    {candidate.skills.slice(0, 3).map((skill) => (
                      <Chip key={skillName(skill)}>{skillName(skill)}</Chip>
                    ))}
                  </div>

                  <span className="text-xs text-ink-subtle">
                    {candidate.completion}% complete
                  </span>

                  <StatusBadge label={strength.label} tone={strength.tone} />
                </Card>
              );
            })}
          </div>

          {hasMore ? (
            <div className="text-center">
              <Link
                href={href({ show: String(limit + PAGE) })}
                scroll={false}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-card-muted"
              >
                Show more
                <span className="text-ink-subtle">
                  ({(count - candidates.length).toLocaleString("en-ZA")} more)
                </span>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
