import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  RecommendedJobCard,
  SavedViewedRow,
} from "@/components/job-cards";
import { PortalFooter } from "@/components/portal-footer";
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
  PanelCard,
  SectionHeading,
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
 * The frame titles this page "Your dashboard" rather than greeting anyone,
 * so the greeting helper that used to build "Welcome back, <first name>" is
 * gone. It also sidesteps a problem that helper existed for: a new account
 * has no name yet, and display_name falls back to the email address.
 */

async function Dashboard() {
  // Relative dates ('3 days ago') are true only at the moment they are
  // rendered, so this subtree is request-time rather than prerendered.
  await connection();
  const result = await api.candidateDashboard();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const {
    user,
    profile,
    recent_applications,
    recommended_jobs,
    saved_jobs_list,
    recently_viewed,
  } = result.data;
  const strength =
    PROFILE_STRENGTH[profile.strength] ?? PROFILE_STRENGTH.getting_started;
  const incomplete = profile.sections.filter((s) => !s.completed);

  return (
    <div>
      {/*
        844 + 20 + 268 = the 1132 content width the frame uses.

        The heading belongs inside the left column, not above both: on the
        frame the profile panel's top is level with "Your dashboard". With
        the heading above the grid the panel started 189px lower, which both
        looked unaligned and delayed the point at which it pins.
      */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_268px] lg:items-start">
        {/* Main column. */}
        <div className="flex flex-col gap-8">
          <PageHeading
            title="Your dashboard"
            subtext="Track your applications, complete your profile and discover jobs matched to your experience"
          />

          <div className="space-y-5">
          {/*
            One card holding its own title and the rows, divided by
            hairlines - frame 11:4881. It used to be a heading outside a
            stack of separate cards, which read as five unrelated things
            rather than one list.
          */}
          <PanelCard
            title="Active Applications"
            href="/portal/applications"
            expandLabel="See all applications"
          >
            {recent_applications.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-ink-subtle">
                Apply for a role and you can track its progress here.
              </p>
            ) : (
              recent_applications.map((application, index) => (
                <div
                  key={application.id}
                  className={cn(
                    "flex items-center justify-between gap-4 px-6 py-3.5",
                    index < recent_applications.length - 1 &&
                      "border-b border-line-soft",
                  )}
                >
                  <Link
                    href={`/jobs/${application.job.id}`}
                    className="min-w-0 truncate py-2 text-base font-semibold leading-6 text-ink-body hover:text-brand-700"
                  >
                    {application.job.title}
                  </Link>

                  <div className="flex shrink-0 items-center gap-10">
                    <StatusBadge
                      label={application.status_label}
                      tone={APPLICATION_STATUS_TONE[application.status] ?? "grey"}
                    />
                    <Link
                      href={`/jobs/${application.job.id}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold leading-5 text-brand-700"
                    >
                      View job details
                      <Icon name="chevron-right" className="size-5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </PanelCard>

          <PanelCard
            title="Recommended Jobs"
            href="/portal/recommended"
            expandLabel="See all recommended jobs"
          >
            {recommended_jobs.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-ink-subtle">
                Nothing to recommend yet.
              </p>
            ) : (
              <div className="grid gap-5 px-6 pb-4 sm:grid-cols-2 xl:grid-cols-3">
                {recommended_jobs.map((job) => (
                  <RecommendedJobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </PanelCard>

          {/* Two panels side by side, 412px each with a 20px gutter. */}
          <div className="grid gap-5 lg:grid-cols-2">
            <PanelCard
              title="Saved Jobs"
              href="/portal/saved"
              expandLabel="See all saved jobs"
            >
              {saved_jobs_list.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-ink-subtle">
                  Bookmark a role and it waits for you here.
                </p>
              ) : (
                saved_jobs_list.map((entry, index) => (
                  <SavedViewedRow
                    key={`saved-${entry.job.id}-${entry.at}`}
                    job={entry.job}
                    at={entry.at}
                    verb="Saved"
                    action="apply"
                    divided={index < saved_jobs_list.length - 1}
                  />
                ))
              )}
            </PanelCard>

            <PanelCard title="Recently viewed">
              {recently_viewed.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-ink-subtle">
                  Roles you open show up here.
                </p>
              ) : (
                recently_viewed.map((entry, index) => (
                  <SavedViewedRow
                    key={`viewed-${entry.job.id}-${entry.at}`}
                    job={entry.job}
                    at={entry.at}
                    verb="Viewed"
                    action="details"
                    divided={index < recently_viewed.length - 1}
                  />
                ))
              )}
            </PanelCard>
          </div>

          </div>
        </div>

        {/* Right column — the big profile-completion panel. */}
        {/* Sits at the top of the page and scrolls away with everything
            else. It was sticky, which pinned it to the viewport and carried
            it down the screen as you scrolled; Ethan asked for the opposite
            - anchored to the page, not following the reader. */}
        <aside className="space-y-5 lg:self-start">
          {/*
            The petrol panel from the frame. Dark in both themes, on fixed
            --panel-* tokens: the brand ramp inverts for dark mode, which
            under a panel whose whole point is to be the dark surface would
            turn it pale and leave white text on near-white.

            It carries only what the frame carries — the wheel, the status
            and the one action. The branded-CV download and the list of
            unfinished sections sit in their own card below, rather than
            being crammed onto a surface that was designed to say one thing.
          */}
          {/* The frame calls this one "sticky": the wheel stays put while
              the long left column scrolls. Sticky goes on the panel, not on
              the column - the column is taller than the viewport, so pinning
              that only takes effect once you reach its end.

              The offset clears the sticky header (63px) plus the page's own
              20px gutter; at top-5 the panel's title slid under it.

              The height cap is what the frame means by "fills to viewport
              bottom". Without it the panel is 685px, which plus the offset
              is taller than a 13-inch laptop's viewport - and a sticky box
              taller than the space it has cannot hold, so it drifted up the
              screen as you scrolled instead of staying put. */}
          <section className="flex flex-col gap-5 rounded-2xl bg-panel p-6 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold leading-8 text-panel-ink">
                Profile
              </h2>
              <Link
                href="/portal/profile"
                title="Open my profile"
                className="shrink-0 text-panel-ink-muted transition-colors hover:text-panel-ink"
              >
                <Icon name="expand" className="size-6" />
                <span className="sr-only">Open my profile</span>
              </Link>
            </div>

            <div className="flex justify-center">
              <ProgressCircle
                value={profile.completion}
                size="2xl"
                tone="panel"
                title="Profile completion"
              />
            </div>

            {/* Label left, status badge right, filling the panel width. */}
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-card-muted py-1 pl-3 pr-1">
              <span className="shrink-0 whitespace-nowrap text-xs font-medium leading-[18px] text-ink-muted">
                Profile status
              </span>
              <StatusBadge label={strength.label} tone="grey" />
            </div>

            <p className="text-center text-sm leading-5 text-panel-ink-muted">
              {profile.completion >= 100
                ? "Your profile is complete. A full profile is ranked higher against every role you apply for."
                : "A complete profile gets you better job matches and more recruiter visibility."}
            </p>

            {/*
              "Still to complete" belongs on the panel (frame 127:4320), not
              in a card underneath it. Status is the dot colour alone - amber
              for started, grey for not - and the whole row opens its section.
            */}
            {incomplete.length > 0 ? (
              <div className="mt-6 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold leading-5 text-panel-ink">
                    Still to complete
                  </h3>
                  <span className="text-xs leading-[18px] text-panel-ink-muted">
                    {incomplete.length}{" "}
                    {incomplete.length === 1 ? "section" : "sections"}
                  </span>
                </div>

                <div className="py-1">
                  <div className="h-px w-full bg-panel-track" />
                </div>

                {incomplete.map((section) => (
                  <Link
                    key={section.slug}
                    href={`/portal/profile/edit#${section.slug}`}
                    className="flex items-center gap-2 rounded-md py-1.5 transition-colors hover:bg-white/5"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        section.progress > 0 ? "bg-yellow" : "bg-line-strong",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium leading-[18px] text-panel-ink">
                      {section.label}
                    </span>
                    <Icon
                      name="chevron-right"
                      className="size-3.5 shrink-0 text-panel-ink-muted"
                    />
                  </Link>
                ))}
              </div>
            ) : null}

            <Link
              href="/portal/profile"
              className="mt-1 flex w-full items-center justify-center rounded-lg border border-brand-secondary bg-brand-secondary px-3.5 py-2 text-sm font-semibold leading-5 text-brand-secondary-ink shadow-xs transition-colors hover:border-brand-secondary-hover hover:bg-brand-secondary-hover"
            >
              {profile.completion === 0
                ? "Fill in your profile"
                : profile.completion >= 100
                  ? "Review and update my profile"
                  : "Complete your profile"}
            </Link>
          </section>

          <Card className="p-6">
            <p className="text-center text-sm leading-relaxed text-ink-muted">
              {profile.can_download_branded_cv
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

          </Card>
        </aside>
      </div>

      <PortalFooter />
    </div>
  );
}
