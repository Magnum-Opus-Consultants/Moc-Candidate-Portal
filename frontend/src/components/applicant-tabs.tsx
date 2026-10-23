"use client";

import Link from "next/link";
import { useState } from "react";

import { CandidateBookmarkButton } from "@/components/candidate-actions";
import { Icon } from "@/components/ui/icon";
import {
  APPLICATION_STATUS_TONE,
  Avatar,
  EmptyState,
  MatchChip,
  StatusBadge,
  cn,
} from "@/components/ui/primitives";
import {
  relativeDays,
  type Applicant,
  type CandidatePane,
  type SuggestedCandidate,
} from "@/lib/api";

/**
 * A position's candidates, as a list beside the one you are reading.
 *
 * It used to be four stacked lists of thin rows, where judging anyone meant
 * opening their profile and coming back. The frame makes it master and
 * detail: pick a name on the left and the whole case for them is on the
 * right — where they are, how long they have worked, when they applied,
 * why the engine matched them, what they can do and what they studied.
 * That is the comparison a manager is actually doing.
 *
 * Shortlisted stays as a tab even though the frame shows three. It is a
 * real pipeline stage with a real action behind it, and dropping it to
 * match a picture would delete working behaviour.
 */

type TabKey = "suggested" | "favourites" | "all";

/*
 * Three, as the frame has them. Shortlisted was a fourth here; it is a
 * filtered view, not a capability, and shortlisting still happens from a
 * candidate's own page — so the tab goes and nothing a manager can do goes
 * with it.
 */
const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "suggested", label: "Suggested" },
  { key: "favourites", label: "Saved" },
  { key: "all", label: "All Applicants" },
];

/** One shape for the list and the pane, whichever tab produced the row. */
type Row = {
  id: string;
  candidateId: number;
  name: string;
  initials: string;
  pane: CandidatePane;
  /** Whether this manager has bookmarked the candidate. */
  saved: boolean;
  location: string;
  headline: string;
  match: Applicant["match"];
  /** Applicants only — a suggestion has not applied. */
  appliedAt?: string;
  status?: string;
  statusLabel?: string;
};

function fromApplicant(a: Applicant): Row {
  return {
    id: `a-${a.id}`,
    candidateId: a.candidate.id,
    name: a.candidate.name,
    initials: a.candidate.initials,
    pane: a.pane,
    saved: a.saved,
    location: a.location,
    headline: a.headline,
    match: a.match,
    appliedAt: a.applied_at,
    status: a.status,
    statusLabel: a.status_label,
  };
}

function fromSuggestion(c: SuggestedCandidate): Row {
  return {
    id: `s-${c.candidate.id}`,
    candidateId: c.candidate.id,
    name: c.candidate.name,
    initials: c.candidate.initials,
    pane: c.pane,
    saved: c.saved,
    location: c.location,
    headline: c.headline,
    match: c.match,
  };
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
  const rows: Record<TabKey, Row[]> = {
    suggested: tabs.suggested.map(fromSuggestion),
    favourites: tabs.favourites.map(fromApplicant),
    all: tabs.all.map(fromApplicant),
  };

  // Open on a tab that has something in it, so the page does not greet a
  // manager with an empty list when candidates are waiting one tab over.
  const firstFilled = TABS.find((t) => rows[t.key].length > 0)?.key ?? "all";
  const [tab, setTab] = useState<TabKey>(firstFilled);
  const [chosen, setChosen] = useState<string | null>(null);

  const list = rows[tab];
  const selected = list.find((r) => r.id === chosen) ?? list[0] ?? null;

  return (
    <section className="overflow-hidden rounded-2xl bg-card shadow-xs">
      <div role="tablist" className="flex overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={on}
              onClick={() => {
                setTab(t.key);
                setChosen(null);
              }}
              className={cn(
                "flex h-[50px] shrink-0 items-center gap-1.5 border-b-2 px-5 text-[13px] transition-colors",
                on
                  ? "border-brand-500 font-semibold text-brand-600"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {t.label} ({rows[t.key].length})
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="p-10">
          <EmptyState
            title={`No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} yet`}
            body="Nothing to show on this tab for this position."
          />
        </div>
      ) : (
        <div className="grid items-start gap-0 lg:grid-cols-[minmax(320px,26%)_minmax(0,1fr)]">
          <ol
            role="tabpanel"
            className="max-h-[640px] space-y-2.5 overflow-y-auto border-line p-4 lg:border-r"
          >
            {list.map((row) => (
              <li key={row.id}>
                <CandidateCard
                  row={row}
                  selected={selected?.id === row.id}
                  onSelect={() => setChosen(row.id)}
                />
              </li>
            ))}
          </ol>

          {selected ? <CandidateDetail row={selected} /> : null}
        </div>
      )}
    </section>
  );
}

function CandidateCard({
  row,
  selected,
  onSelect,
}: {
  row: Row;
  selected: boolean;
  onSelect: () => void;
}) {
  const years = row.pane.years_experience;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-brand-500 bg-brand-50"
          : "border-line bg-card hover:bg-card-muted",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Avatar initials={row.initials} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-strong">
            {row.name}
          </p>
          <p className="truncate text-xs text-ink-muted">
            {row.pane.role_title || row.headline}
          </p>
        </div>
        {/* Shown, not pressable: saving is done from the pane, where the
            button says what it does. A second control here would be two
            ways to do one thing, one of them unlabelled. */}
        <Icon
          name="bookmark"
          className={cn(
            "size-4 shrink-0",
            row.saved ? "fill-current text-brand-700" : "text-ink-subtle",
          )}
        />
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
        {row.location ? (
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" className="size-3" />
            {row.location}
          </span>
        ) : null}
        {years ? (
          <span className="inline-flex items-center gap-1">
            <Icon name="building" className="size-3" />
            {years} {years === 1 ? "year" : "years"}
          </span>
        ) : null}
      </p>

      {row.match.reasons.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {row.match.reasons.slice(0, 2).map((reason) => (
            <MatchChip
              key={reason.label}
              label={reason.label}
              level={reason.level}
            />
          ))}
          {row.match.reasons.length > 2 ? (
            <span
              className="text-xs text-ink-subtle"
              title={row.match.reasons
                .slice(2)
                .map((reason) => reason.label)
                .join(", ")}
            >
              +{row.match.reasons.length - 2} more
            </span>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}

function CandidateDetail({ row }: { row: Row }) {
  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar initials={row.initials} size="lg" />
          <div>
            <h3 className="text-lg font-semibold text-ink-strong">{row.name}</h3>
            <p className="text-sm text-brand-700">
              {row.pane.role_title || row.headline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {row.statusLabel ? (
            <StatusBadge
              label={row.statusLabel}
              tone={APPLICATION_STATUS_TONE[row.status ?? ""] ?? "grey"}
            />
          ) : null}
          <CandidateBookmarkButton
            candidateId={row.candidateId}
            initialSaved={row.saved}
          />
        </div>
      </div>

      <dl className="mt-5 grid max-w-4xl gap-3 sm:grid-cols-2">
        <Tile icon="pin" label="Location" value={row.location || "Not given"} />
        <Tile
          icon="building"
          label="Experience"
          value={
            row.pane.years_experience
              ? `${row.pane.years_experience} years`
              : "Not given"
          }
        />
        <Tile
          icon="clock"
          label="Availability"
          value={row.pane.availability_label || "Not given"}
        />
        <Tile
          icon="calendar"
          label={row.appliedAt ? "Applied" : "Status"}
          value={
            row.appliedAt
              ? relativeDays(row.appliedAt).toLowerCase()
              : "Suggested — has not applied"
          }
        />
      </dl>

      {row.pane.summary ? (
        <Block title="Summary">
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            {row.pane.summary}
          </p>
        </Block>
      ) : null}

      {row.match.reasons.length > 0 ? (
        <Block title="Match criteria">
          <div className="flex flex-wrap gap-1.5">
            {row.match.reasons.map((reason) => (
              <MatchChip
                key={reason.label}
                label={reason.label}
                level={reason.level}
              />
            ))}
          </div>
        </Block>
      ) : null}

      {row.pane.skills.length > 0 ? (
        <Block title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {row.pane.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink"
              >
                {skill}
              </span>
            ))}
          </div>
        </Block>
      ) : null}

      {row.pane.education ? (
        <Block title="Education">
          <p className="text-sm text-ink-muted">{row.pane.education}</p>
        </Block>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/manager/candidates/${row.candidateId}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-panel-action px-4 text-sm font-semibold text-panel-ink transition-colors hover:bg-panel-action-hover"
        >
          <Icon name="expand" className="size-3.5" />
          View Full Profile
        </Link>
        <Link
          href={`/manager/candidates/${row.candidateId}/cv`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-card px-4 text-sm font-semibold text-ink transition-colors hover:bg-card-muted"
        >
          <Icon name="download" className="size-3.5" />
          Download CV
        </Link>
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: "pin" | "building" | "clock" | "calendar";
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-card-muted px-3.5 py-2.5">
      <Icon name={icon} className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
      <div className="min-w-0">
        <dt className="text-[11px] leading-4 text-ink-subtle">{label}</dt>
        <dd className="truncate text-sm font-semibold text-ink-strong">
          {value}
        </dd>
      </div>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h4 className="text-sm font-semibold text-ink-strong">{title}</h4>
      <div className="mt-2">{children}</div>
    </section>
  );
}
