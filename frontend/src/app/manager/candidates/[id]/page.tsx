import Link from "next/link";
import { CandidateComments } from "@/components/candidate-comments";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProfileSectionRow } from "@/components/job-cards";
import { CandidateActions } from "@/components/candidate-actions";
import { PhotoViewer } from "@/components/photo-viewer";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { ProgressCircle } from "@/components/ui/progress-circle";
import {
  APPLICATION_STATUS_TONE,
  Button,
  Card,
  Chip,
  PROFILE_STRENGTH,
  SectionHeading,
  StatusBadge,
} from "@/components/ui/primitives";
import { api, formatDate, relativeDays, skillName } from "@/lib/api";

export default function CandidateProfilePage({
  params,
}: PageProps<"/manager/candidates/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CandidateDetail params={params} />
    </Suspense>
  );
}

async function CandidateDetail({
  params,
}: {
  params: PageProps<"/manager/candidates/[id]">["params"];
}) {
  // Relative dates ('3 days ago') are true only at the moment they are
  // rendered, so this subtree is request-time rather than prerendered.
  await connection();
  const { id } = await params;
  // The shortlist belongs to a posting, so the menu needs the open ones.
  const [result, jobsResult] = await Promise.all([
    api.managerCandidate(id),
    api.managerJobs("?status=active&limit=50"),
  ]);
  const openJobs = jobsResult.ok
    ? jobsResult.data.results.map((job) => ({ id: job.id, title: job.title }))
    : [];

  if (!result.ok) {
    if (result.error.startsWith("404")) notFound();
    return <BackendOffline error={result.error} />;
  }

  const { profile, applications, comments } = result.data;
  // Who is signed in, so their own notes offer a Remove.
  const me = await api.me();
  const viewerId = me.ok && me.data ? me.data.id : null;
  const strength =
    PROFILE_STRENGTH[profile.strength] ?? PROFILE_STRENGTH.getting_started;

  return (
    <div className="space-y-6">
      <Link
        href="/manager/candidates"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <Icon name="chevron-right" className="size-3.5 rotate-180" />
        Candidate database
      </Link>

      {/* Profile header from the designs: bookmark and shortlist on the right. */}
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <PhotoViewer
          url={profile.photo_url}
          initials={profile.user.initials}
          name={profile.user.name}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-strong">{profile.user.name}</p>
          <p className="text-sm text-ink-muted">
            {profile.headline}
            {profile.location ? ` · ${profile.location}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-ink-subtle">
            Profile updated {relativeDays(profile.updated_at).toLowerCase()}
          </p>
        </div>
        <CandidateActions
          candidateId={profile.user.id}
          initialBookmarked={result.data.is_bookmarked}
          shortlistedJobIds={result.data.shortlisted_job_ids}
          jobs={openJobs}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section>
            <SectionHeading title="Applications" />
            {applications.length === 0 ? (
              <Card className="p-5 text-sm text-ink-subtle">
                This candidate has not applied for any of your postings.
              </Card>
            ) : (
              <Card className="divide-y divide-line">
                {applications.map((application) => (
                  <div
                    key={application.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/manager/jobs/${application.job.id}`}
                        className="font-medium text-ink-strong hover:text-brand-700"
                      >
                        {application.job.title}
                      </Link>
                      <p className="text-xs text-ink-subtle">
                        Applied {formatDate(application.applied_at)}
                      </p>
                    </div>
                    <StatusBadge
                      label={application.status_label}
                      tone={APPLICATION_STATUS_TONE[application.status] ?? "grey"}
                    />
                  </div>
                ))}
              </Card>
            )}
          </section>

          <CandidateComments
            candidateId={profile.user.id}
            viewerId={viewerId}
            initial={comments}
          />

          <section>
            <SectionHeading title="Profile sections" />
            <Card className="divide-y divide-line">
              {profile.sections.map((section) => (
                <ProfileSectionRow key={section.slug} section={section} />
              ))}
            </Card>
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-ink">Profile strength</p>
              <StatusBadge label={strength.label} tone={strength.tone} />
            </div>
            <div className="mt-4 flex justify-center">
              <ProgressCircle
                value={profile.completion}
                size="md"
                label="Complete"
                title="Profile completion"
              />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-medium text-ink">Skills & tools</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <Chip key={skillName(skill)}>{skillName(skill)}</Chip>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-medium text-ink">Documents</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-subtle">
              Download this candidate&apos;s profile as a PDF together with the
              CV they uploaded.
            </p>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              <Icon name="download" className="size-3.5" />
              Download profile PDF
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
