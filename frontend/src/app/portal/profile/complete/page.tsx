import Link from "next/link";
import { Suspense } from "react";

import { ProfileForm } from "@/components/profile-form/profile-form";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { api } from "@/lib/api";

export const metadata = {
  title: "Complete your profile",
};

/**
 * "Complete your profile" — the eight-section creation flow.
 *
 * Its own route rather than part of /portal/profile: the designs give it a
 * full-width canvas with its own Back / Cancel / Skip header instead of the
 * portal sidebar, because a seeker lands here straight after signing up and
 * on the way to applying.
 */
export default function CompleteProfilePage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-card">
        <div className="flex h-14 items-center justify-end gap-4 px-6">
          <div className="flex items-center gap-1">
            <Link
              href="/portal/profile"
              className="rounded-lg px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
            >
              Cancel
            </Link>
            <Link
              href="/portal"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
            >
              Skip
            </Link>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="mb-7">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-strong">
            Complete your profile
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Complete your profile to apply for jobs
          </p>
        </div>

        <Suspense fallback={<PageSkeleton />}>
          <Form />
        </Suspense>
      </main>
    </div>
  );
}

async function Form() {
  const [profile, options] = await Promise.all([
    api.candidateProfile(),
    api.profileOptions(),
  ]);

  if (!profile.ok) return <BackendOffline error={profile.error} />;
  if (!options.ok) return <BackendOffline error={options.error} />;

  return <ProfileForm initialProfile={profile.data} options={options.data} />;
}
