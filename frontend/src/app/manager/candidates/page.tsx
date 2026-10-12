import Link from "next/link";
import { Suspense } from "react";

import { ListControls } from "@/components/applicant-tabs";
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
} from "@/components/ui/primitives";
import { api } from "@/lib/api";

export default function CandidateDatabasePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CandidateDatabase />
    </Suspense>
  );
}

async function CandidateDatabase() {
  const result = await api.managerCandidates();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const candidates = result.data.results;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Candidate database"
        subtext={`${candidates.length} ${candidates.length === 1 ? "candidate" : "candidates"} on the portal`}
      />

      <ListControls
        placeholder="Search by name, email, skill or keyword"
        trailing={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink-muted transition-colors hover:border-line-strong"
          >
            <Icon name="filter" className="size-3.5" />
            Filters
          </button>
        }
      />

      {candidates.length === 0 ? (
        <EmptyState
          title="No candidates yet"
          body="Candidates appear here once they create a profile."
        />
      ) : (
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
                    <Chip key={skill}>{skill}</Chip>
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
      )}
    </div>
  );
}
