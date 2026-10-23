import { Suspense } from "react";

import { ProfileForm } from "@/components/profile-form/profile-form";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { PageHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export const metadata = {
  title: "Edit profile",
};

/**
 * The profile form, inside the portal shell.
 *
 * This used to be /portal/profile itself. That page is now the overview the
 * frame shows — identity, then a section-by-section completion list — and
 * each "Edit section" lands here on the matching anchor, since every
 * section in the form already carries its slug as an id.
 *
 * It is the same component as the creation flow at
 * /portal/profile/complete. Two forms over one profile is how the two drift
 * apart, which is exactly what the older short form here did.
 */
export default function EditProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Edit profile"
        subtext="Fill in your details — your completion rises as you go."
      />

      <Suspense fallback={<PageSkeleton />}>
        <Edit />
      </Suspense>
    </div>
  );
}

async function Edit() {
  const [profile, options] = await Promise.all([
    api.candidateProfile(),
    api.profileOptions(),
  ]);

  if (!profile.ok) return <BackendOffline error={profile.error} />;
  if (!options.ok) return <BackendOffline error={options.error} />;

  return (
    <ProfileForm initialProfile={profile.data} options={options.data} brandedCv />
  );
}
