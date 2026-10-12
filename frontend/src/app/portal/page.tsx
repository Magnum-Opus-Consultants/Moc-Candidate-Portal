import Link from "next/link";
import { Suspense } from "react";

import { ProfileSectionRow, RecommendedJobCard } from "@/components/job-cards";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { ProgressCircle } from "@/components/ui/progress-circle";
import {
  APPLICATION_STATUS_TONE,
  Button,
  Card,
  EmptyState,
  PROFILE_STRENGTH,
  PageHeading,
  SectionHeading,
  StatCard,
  StatusBadge,
} from "@/components/ui/primitives";
import { api, relativeDays } from "@/lib/api";

export default function CandidateDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const result = await api.candidateDashboard();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const { user, profile, stats, recent_applications, recommended_jobs } =
    result.data;
  const strength =
    PROFILE_STRENGTH[profile.strength] ?? PROFILE_STRENGTH.getting_started;
  const incomplete = profile.sections.filter((s) => !s.completed);

  return (
    <div className="space-y-8">
      <PageHeading
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        subtext="Your applications, saved roles and the positions we think fit you."
        action={
          <Button href="/" variant="outline" size="sm">
            Browse all jobs
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Main column. */}
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              value={stats.active_applications}
              title="Active applications"
              supporting="Still in progress"
            />
            <StatCard
              value={stats.shortlisted}
              title="Shortlisted"
              supporting="You made the cut"
            />
            <StatCard
              value={stats.saved_jobs}
              title="Saved jobs"
              supporting="Roles you kept for later"
            />
            <StatCard
              value={stats.total_applications}
              title="Total applications"
              supporting="All time"
            />
          </div>

          <section>
            <SectionHeading
              title="Active applications"
              action={
                <Link
                  href="/portal/applications"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-700"
                >
                  View all
                  <Icon name="chevron-right" className="size-3.5" />
                </Link>
              }
            />
            {recent_applications.length === 0 ? (
              <EmptyState
                title="No applications yet"
                body="Apply for a role and you can track its progress here."
              />
            ) : (
              <div className="space-y-2">
                {recent_applications.map((application) => (
                  <Card
                    key={application.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/jobs/${application.job.id}`}
                        className="font-medium text-ink-strong hover:text-brand-700"
                      >
                        {application.job.title}
                      </Link>
                      <p className="text-xs text-ink-subtle">
                        {application.job.company} · applied{" "}
                        {relativeDays(application.applied_at).toLowerCase()}
                      </p>
                    </div>
                    <StatusBadge
                      label={application.status_label}
                      tone={APPLICATION_STATUS_TONE[application.status] ?? "grey"}
                    />
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeading
              title="Recommended for you"
              subtext="Ranked against your profile by the matching engine"
              action={
                <Link
                  href="/portal/recommended"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-700"
                >
                  View all
                  <Icon name="chevron-right" className="size-3.5" />
                </Link>
              }
            />
            {recommended_jobs.length === 0 ? (
              <EmptyState title="Nothing to recommend yet" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {recommended_jobs.map((job) => (
                  <RecommendedJobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column — the big profile-completion panel. */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-ink-strong">
                Profile completion
              </h2>
              <StatusBadge label={strength.label} tone={strength.tone} />
            </div>

            <div className="mt-5 flex justify-center">
              <ProgressCircle
                value={profile.completion}
                size="xl"
                label="Complete"
                title="Profile completion"
              />
            </div>

            <p className="mt-5 text-center text-sm leading-relaxed text-ink-muted">
              {profile.can_download_branded_cv
                ? "Your profile is complete enough to download an MOC-branded CV."
                : `Reach 80% to unlock your MOC-branded CV — ${80 - profile.completion}% to go.`}
            </p>

            <Button
              size="sm"
              className="mt-4 w-full"
              variant={profile.can_download_branded_cv ? "primary" : "outline"}
              disabled={!profile.can_download_branded_cv}
            >
              <Icon name="download" className="size-3.5" />
              Download branded CV
            </Button>

            {incomplete.length > 0 ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-subtle">
                  Finish these next
                </p>
                <div className="divide-y divide-line">
                  {incomplete.slice(0, 3).map((section) => (
                    <ProfileSectionRow key={section.slug} section={section} />
                  ))}
                </div>
              </div>
            ) : null}

            <Link
              href="/portal/profile"
              className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              {profile.completion === 0 ? "Fill in your profile" : "Complete your profile"}
              <Icon name="chevron-right" className="size-3.5" />
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
