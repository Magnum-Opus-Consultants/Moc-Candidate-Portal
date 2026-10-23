import Link from "next/link";
import { Suspense } from "react";

import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { Avatar, PageHeading, cn } from "@/components/ui/primitives";
import { api, type ProfileSection } from "@/lib/api";

export const metadata = {
  title: "My Profile",
};

/** Where "Edit section" lands — the form, on that section's anchor. */
const FORM = "/portal/profile/edit";

/**
 * "My Profile" — an overview, not the form.
 *
 * The form itself moved to /portal/profile/edit. What a returning seeker
 * wants from this page is not eight open sections but an answer to "what is
 * left to do", and then a way into exactly that part. So this is the
 * identity card and a section-by-section completion list, each row linking
 * into the form at its own anchor.
 *
 * A completed section still gets a way in: "Completed!" is a statement, and
 * the pencil beside it is the way to change your mind.
 */
export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="My Profile"
        subtext="Review and edit your contact details and profile"
      />

      <Suspense fallback={<PageSkeleton />}>
        <Overview />
      </Suspense>
    </div>
  );
}

async function Overview() {
  const result = await api.candidateProfile();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const profile = result.data;
  const { user } = profile;
  const done = profile.sections.filter((s) => s.completed).length;

  return (
    <div className="space-y-5">
      {/* --- Identity -------------------------------------------------- */}
      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-card p-5">
        <Avatar initials={user.initials} size="lg" />

        <div className="min-w-48 flex-1">
          <h2 className="text-lg font-semibold text-ink-strong">{user.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            <Icon name="mail" className="size-3.5 shrink-0" />
            {user.email}
          </p>
          {user.phone ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
              <Icon name="phone" className="size-3.5 shrink-0" />
              {user.phone}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={FORM}
            className="inline-flex h-9 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            {profile.completion >= 100 ? "Edit profile" : "Complete profile"}
          </Link>
          {/* The same destination as the button beside it, so it is hidden
              from assistive tech rather than read out twice. */}
          <Link
            href={FORM}
            aria-hidden
            tabIndex={-1}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
          >
            <Icon name="edit" className="size-4" />
          </Link>
        </div>
      </section>

      {/* --- Completion ------------------------------------------------ */}
      <section className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink-strong">
            Profile Completion
          </h2>
          <p className="mt-0.5 text-xs text-ink-subtle">
            {done} of {profile.sections.length} sections complete —{" "}
            {profile.completion}% overall
          </p>
        </div>

        <ul className="divide-y divide-line">
          {profile.sections.map((section) => (
            <SectionRow key={section.slug} section={section} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function SectionRow({ section }: { section: ProfileSection }) {
  const href = `${FORM}#${section.slug}`;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
      <span className="flex min-w-44 flex-1 items-center gap-2.5">
        {section.completed ? (
          <Icon name="check" className="size-4 shrink-0 text-status-green" />
        ) : (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full border border-line-strong"
          />
        )}
        <span className="text-sm font-medium text-ink-strong">
          {section.label}
        </span>
      </span>

      {/* Green once finished, brand while in progress: the colour is the
          fastest read on this page, so it carries the same meaning as the
          word beside it rather than a second one. */}
      <span
        aria-hidden
        className="h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-card-muted"
      >
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-500",
            section.completed ? "bg-status-green" : "bg-brand-700",
          )}
          style={{ width: `${Math.min(Math.max(section.progress, 0), 100)}%` }}
        />
      </span>

      <span className="w-10 text-right text-sm tabular-nums text-ink-muted">
        {section.progress}%
      </span>

      {section.completed ? (
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-status-green">
            Completed!
          </span>
          <Link
            href={href}
            aria-label={`Edit ${section.label}`}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
          >
            <Icon name="edit" className="size-3.5" />
          </Link>
        </span>
      ) : (
        <Link
          href={href}
          className="group inline-flex h-8 items-center gap-1 rounded-lg bg-brand-50 px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
        >
          Edit section
          <Icon
            name="chevron-right"
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </li>
  );
}
