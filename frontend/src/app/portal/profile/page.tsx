import { Suspense } from "react";

import { ProfileSectionRow } from "@/components/job-cards";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { ProgressCircle } from "@/components/ui/progress-circle";
import {
  Avatar,
  Button,
  Card,
  Chip,
  PROFILE_STRENGTH,
  PageHeading,
  SectionHeading,
  StatusBadge,
} from "@/components/ui/primitives";
import { api } from "@/lib/api";

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  const result = await api.candidateProfile();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const profile = result.data;
  const strength =
    PROFILE_STRENGTH[profile.strength] ?? PROFILE_STRENGTH.getting_started;

  return (
    <div className="space-y-8">
      <PageHeading title="My Profile" />

      {/* Profile section header from the designs. */}
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <Avatar initials={profile.user.initials} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-strong">{profile.user.name}</p>
          <p className="text-sm text-ink-muted">{profile.headline}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="mail" className="size-3.5" />
              {profile.user.email}
            </span>
            {profile.user.phone ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="phone" className="size-3.5" />
                {profile.user.phone}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm">Complete profile</Button>
          <button
            type="button"
            className="rounded-lg border border-line p-2 text-ink-muted transition-colors hover:border-line-strong"
          >
            <span className="sr-only">Edit profile</span>
            <Icon name="edit" />
          </button>
        </div>
      </Card>

      <section>
        <SectionHeading
          title="Profile strength"
          subtext={`${profile.completion}% complete`}
          action={<StatusBadge label={strength.label} tone={strength.tone} />}
        />
        <Card className="flex flex-wrap items-center gap-6 p-5">
          <ProgressCircle
            value={profile.completion}
            size="lg"
            label="Complete"
            title="Profile completion"
          />
          <div className="min-w-64 flex-1">
            <p className="text-sm leading-relaxed text-ink-muted">
              {profile.can_download_branded_cv
                ? "You can download your MOC-branded CV."
                : `The MOC-branded CV unlocks at 80% — ${80 - profile.completion}% to go.`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Icon name="sparkle" className="size-3.5" />
                Get AI advice on my CV
              </Button>
              <Button size="sm" disabled={!profile.can_download_branded_cv}>
                <Icon name="download" className="size-3.5" />
                Download branded CV
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeading
          title="Profile sections"
          subtext="Each section contributes to your overall completion"
        />
        <Card className="divide-y divide-line">
          {profile.sections.map((section) => (
            <ProfileSectionRow key={section.slug} section={section} />
          ))}
        </Card>
      </section>

      <section>
        <SectionHeading title="Skills & tools" />
        <Card className="p-5">
          {profile.skills.length === 0 ? (
            <p className="text-sm text-ink-subtle">No skills captured yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <Chip key={skill}>{skill}</Chip>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section>
        <SectionHeading
          title="CV and supporting documents"
          subtext="Upload a PDF CV and we fill in most of your profile for you"
        />
        <Card className="border-dashed p-8 text-center">
          <Icon name="download" className="mx-auto size-6 rotate-180 text-ink-subtle" />
          <p className="mt-3 text-sm font-medium text-ink">Upload your CV as a PDF</p>
          <p className="mt-1 text-xs text-ink-subtle">
            Certifications, ID, driver&apos;s licence and a cover letter can go here too.
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            Choose files
          </Button>
        </Card>
      </section>
    </div>
  );
}
