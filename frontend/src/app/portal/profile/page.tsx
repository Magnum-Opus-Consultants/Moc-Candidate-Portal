import { Suspense } from "react";

import { ProfileForm } from "@/components/profile-form/profile-form";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { PageHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export const metadata = {
  title: "My Profile",
};

/**
 * "My Profile" — the same eight-section form as the creation flow.
 *
 * It used to be a short, separate form of its own (name, headline, a comma
 * separated skills box) written before the eight-section design existed. Two
 * forms over one profile meant a seeker could only edit a third of their
 * details here, and the two could not help drifting apart. There is now one
 * form: this page wraps it in the portal shell and adds the branded-CV
 * download, and /portal/profile/complete gives it the full-width canvas the
 * designs show for a seeker who has just signed up.
 */
export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="My Profile"
        subtext="Fill in your details — your completion rises as you go."
      />

      <Suspense fallback={<PageSkeleton />}>
        <Profile />
      </Suspense>
    </div>
  );
}

async function Profile() {
  const [profile, options] = await Promise.all([
    api.candidateProfile(),
    api.profileOptions(),
  ]);

  if (!profile.ok) return <BackendOffline error={profile.error} />;
  if (!options.ok) return <BackendOffline error={options.error} />;

  // No identity card above the form: the avatar, name and email it showed
  // are all in the form's own first section, and the masthead already says
  // who is signed in.
  return (
    <ProfileForm initialProfile={profile.data} options={options.data} brandedCv />
  );
}
