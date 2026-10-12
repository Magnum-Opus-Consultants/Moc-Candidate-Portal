"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import {
  APPLICATION_STATUS_TONE,
  Avatar,
  Card,
  CountBadge,
  EmptyState,
  MatchChip,
  StatusBadge,
  cn,
} from "@/components/ui/primitives";
import { relativeDays, type Applicant, type SuggestedCandidate } from "@/lib/api";

/** The four applicant tabs on a position: All, Shortlisted, Favourites, Suggested. */
type TabKey = "all" | "shortlisted" | "favourites" | "suggested";

const TAB_LABELS: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "All applicants" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "favourites", label: "Favourites" },
  { key: "suggested", label: "Suggested" },
];

function ApplicantRow({ applicant }: { applicant: Applicant }) {
  return (
    <Card className="flex flex-wrap items-center gap-4 px-4 py-3">
      <Avatar initials={applicant.candidate.initials} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/manager/candidates/${applicant.candidate.id}`}
          className="font-medium text-ink-strong hover:text-brand-700"
        >
          {applicant.candidate.name}
        </Link>
        <p className="truncate text-xs text-ink-subtle">
          {applicant.headline}
          {applicant.location ? ` · ${applicant.location}` : ""}
        </p>
      </div>

      {applicant.match.reasons.length > 0 ? (
        <div className="hidden flex-wrap gap-1.5 md:flex">
          {applicant.match.reasons.slice(0, 2).map((reason) => (
            <MatchChip key={reason.label} label={reason.label} level={reason.level} />
          ))}
        </div>
      ) : null}

      <span className="text-xs text-ink-subtle">
        Applied {relativeDays(applicant.applied_at).toLowerCase()}
      </span>

      <StatusBadge
        label={applicant.status_label}
        tone={APPLICATION_STATUS_TONE[applicant.status] ?? "grey"}
      />
    </Card>
  );
}

function SuggestedRow({ candidate }: { candidate: SuggestedCandidate }) {
  return (
    <Card className="flex flex-wrap items-center gap-4 px-4 py-3">
      <Avatar initials={candidate.candidate.initials} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/manager/candidates/${candidate.candidate.id}`}
          className="font-medium text-ink-strong hover:text-brand-700"
        >
          {candidate.candidate.name}
        </Link>
        <p className="truncate text-xs text-ink-subtle">
          {candidate.headline}
          {candidate.location ? ` · ${candidate.location}` : ""}
        </p>
      </div>

      <div className="hidden flex-wrap gap-1.5 md:flex">
        {candidate.match.reasons.slice(0, 2).map((reason) => (
          <MatchChip key={reason.label} label={reason.label} level={reason.level} />
        ))}
      </div>

      <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
        {candidate.match.score}% match
      </span>
    </Card>
  );
}

export function ApplicantTabs({
  tabs,
}: {
  tabs: {
    all: Applicant[];
    shortlisted: Applicant[];
    favourites: Applicant[];
    suggested: SuggestedCandidate[];
  };
}) {
  const [active, setActive] = useState<TabKey>("all");

  const counts: Record<TabKey, number> = {
    all: tabs.all.length,
    shortlisted: tabs.shortlisted.length,
    favourites: tabs.favourites.length,
    suggested: tabs.suggested.length,
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Applicants"
        className="flex flex-wrap items-center gap-1 border-b border-line"
      >
        {TAB_LABELS.map((tab) => {
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActive(tab.key)}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors",
                selected
                  ? "border-brand-700 font-medium text-brand-700"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {tab.label}
              <CountBadge value={counts[tab.key]} />
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-4 space-y-2">
        {active === "suggested" ? (
          tabs.suggested.length === 0 ? (
            <EmptyState
              title="No suggested candidates"
              body="Candidates in the database who match this position will appear here."
            />
          ) : (
            tabs.suggested.map((candidate) => (
              <SuggestedRow key={candidate.candidate.id} candidate={candidate} />
            ))
          )
        ) : tabs[active].length === 0 ? (
          <EmptyState
            title={`Nothing in ${TAB_LABELS.find((t) => t.key === active)?.label.toLowerCase()}`}
            body="Shortlist or bookmark a candidate and they will show up here."
          />
        ) : (
          tabs[active].map((applicant) => (
            <ApplicantRow key={applicant.id} applicant={applicant} />
          ))
        )}
      </div>
    </div>
  );
}

/** Search + filter + view toggle bar used above job and candidate lists. */
export function ListControls({
  placeholder,
  trailing,
}: {
  placeholder: string;
  trailing?: React.ReactNode;
}) {
  const [view, setView] = useState<"list" | "grid">("grid");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative min-w-52 flex-1">
        <span className="sr-only">{placeholder}</span>
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
        />
        <input
          type="search"
          placeholder={placeholder}
          className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-700 focus:outline-none"
        />
      </label>

      {trailing}

      <div className="flex rounded-lg border border-line bg-card p-0.5">
        {(["list", "grid"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setView(mode)}
            aria-pressed={view === mode}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === mode
                ? "bg-brand-100 text-brand-700"
                : "text-ink-subtle hover:text-ink",
            )}
          >
            <span className="sr-only">{mode} view</span>
            <Icon name={mode} />
          </button>
        ))}
      </div>
    </div>
  );
}
