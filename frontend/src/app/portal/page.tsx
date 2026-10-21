import Link from "next/link";
import { connection } from "next/server";
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
  cn,
} from "@/components/ui/primitives";
import { api, relativeDays, API_BASE_URL } from "@/lib/api";

export default function CandidateDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

/**
 * A new account has no name yet — sign-up takes only an email — and
 * display_name falls back to the username, which is the email address.
 * Greeting someone by their email reads like a mail-merge gone wrong, so
 * drop the name until there is a real one.
 */
function greeting(name: string): string {
  const first = name.trim().split(" ")[0];
  if (!first || first.includes("@")) return "Welcome back";
  return `Welcome back, ${first}`;
}

async function Dashboard() {
  // Relative dates ('3 days ago') are true only at the moment they are
  // rendered, so this subtree is request-time rather than prerendered.
  await connection();
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
        title={greeting(user.name)}
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
          {/*
            Each tile links to the page behind it — a count the reader cannot
            act on is just decoration. "Total applications" was dropped: with
            nothing applied for it read 0 beside another 0, and once there is
            history it only repeats what the applications page already shows.
            "Roles matched" takes its place, which is the one number that is
            useful on day one.
          */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              href="/portal/applications"
              value={stats.active_applications}
              title="Active applications"
              supporting={
                stats.active_applications === 0
                  ? "Nothing in progress yet"
                  : "Still in progress"
              }
            />
            <StatCard
              href="/portal/applications"
              value={stats.shortlisted}
              title="Shortlisted"
              supporting={
                stats.shortlisted === 0
                  ? "None yet — keep applying"
                  : "You made the cut"
              }
            />
            <StatCard
              href="/portal/saved"
              value={stats.saved_jobs}
              title="Saved jobs"
              supporting={
                stats.saved_jobs === 0
                  ? "Bookmark roles to compare later"
                  : "Roles you kept for later"
              }
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
              {profile.completion >= 100
                ? "Your profile is complete. A full profile is ranked higher against every role you apply for."
                : profile.can_download_branded_cv
                  ? "Your profile is complete enough to download an MOC-branded CV."
                  : `Reach 80% to unlock your MOC-branded CV — ${80 - profile.completion}% to go.`}
            </p>

            {/*
              Not <Button>: this is a real download, so it has to be an
              anchor the browser can follow. Disabled below the gate, where
              a span rather than a link stops it being focusable.
            */}
            {profile.can_download_branded_cv ? (
              <a
                href={`${API_BASE_URL}/api/candidate/cv/`}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-brand-ink shadow-sm transition-all hover:bg-brand-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 active:scale-[0.99]"
              >
                <Icon name="download" className="size-4" />
                Download branded CV
              </a>
            ) : (
              <span
                aria-disabled
                title={`Unlocks at 80% — ${80 - profile.completion}% to go`}
                className="mt-5 flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-line bg-card-muted px-4 text-sm font-semibold text-ink-subtle"
              >
                <Icon name="download" className="size-4" />
                Download branded CV
              </span>
            )}

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

            {/* "Complete your profile" under a full ring is nonsense — once
                it is done the link is for keeping it current. */}
            {/*
              The quiet one once the profile is done: two filled slabs of
              equal weight make neither of them the obvious thing to press.
              The chevron sits in a group-hover nudge rather than floating
              at the end of the line.
            */}
            <Link
              href="/portal/profile"
              className={cn(
                "group mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 active:scale-[0.99]",
                profile.completion >= 100
                  ? "text-ink-muted hover:bg-card-muted hover:text-ink"
                  : "bg-brand-700 text-brand-ink shadow-sm hover:bg-brand-800 hover:shadow-md",
              )}
            >
              {profile.completion === 0
                ? "Fill in your profile"
                : profile.completion >= 100
                  ? "Review and update my profile"
                  : "Complete your profile"}
              <Icon
                name="chevron-right"
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
