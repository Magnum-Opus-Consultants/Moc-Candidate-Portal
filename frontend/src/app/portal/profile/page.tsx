import Link from "next/link";
import { Suspense } from "react";

import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon, type IconName } from "@/components/ui/icon";
import { PhotoViewer } from "@/components/photo-viewer";
import { PortalFooter } from "@/components/portal-footer";
import { PageHeading, cn } from "@/components/ui/primitives";
import { api, type ProfileSection } from "@/lib/api";

export const metadata = {
  title: "My Profile",
};

/** Where "Edit section" lands — the form, on that section's anchor. */
const FORM = "/portal/profile/edit";

/**
 * "My Profile" (frame 11:4969) — an overview, not the form.
 *
 * The form itself lives at /portal/profile/edit. What a returning seeker
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
    <div className="flex min-h-full flex-col">
      <div className="space-y-8">
        <PageHeading
          title="My Profile"
          subtext="Review and edit your contact details and profile"
        />

        <Suspense fallback={<PageSkeleton />}>
          <Overview />
        </Suspense>
      </div>

      <div className="mt-auto pt-14">
        <PortalFooter />
      </div>
    </div>
  );
}

/**
 * The glyph beside each section name (11:4976). The frame gives every
 * section its own, so the list can be scanned by shape rather than read
 * top to bottom; keyed by slug so a section the API adds falls back to
 * something neutral rather than crashing the page.
 */
const SECTION_ICONS: Record<string, IconName> = {
  personal_details: "profile", // User01, as the frame has it
  ee_information: "info-circle",
  career_details: "briefcase-02",
  education: "book-open-01",
  experience: "award-01",
  remuneration: "coins-stacked-01",
  skills_tools: "tool-01",
  privacy_sharing: "shield-02",
};

async function Overview() {
  const result = await api.candidateProfile();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const profile = result.data;
  const { user } = profile;

  return (
    <div className="space-y-8">
      {/* --- Identity (224:13852) -------------------------------------- */}
      <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-card px-6 py-5 shadow-xs">
        {/* The photo the candidate uploaded, not just their initials. It
            was only ever shown to hiring managers, so someone could upload
            one and never see it on their own profile. */}
        <PhotoViewer
          url={profile.photo_url}
          initials={user.initials}
          name={user.name}
          size="xl"
        />

        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <h2 className="text-lg font-semibold leading-7 text-ink-strong">
            {user.name}
          </h2>
          <p className="flex items-center gap-1.5 text-sm leading-5 text-ink-subtle">
            <Icon name="mail" className="size-4 shrink-0" />
            {user.email}
          </p>
          {user.phone ? (
            <p className="flex items-center gap-1.5 text-sm leading-5 text-ink-subtle">
              <Icon name="phone" className="size-4 shrink-0" />
              {user.phone}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-[18px]">
          <Link
            href={FORM}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-brand-secondary bg-brand-secondary px-3.5 text-sm font-semibold leading-5 text-brand-secondary-ink shadow-xs transition-colors hover:border-brand-secondary-hover hover:bg-brand-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            {profile.completion >= 100 ? "Edit profile" : "Complete profile"}
          </Link>
          {/* The same destination as the button beside it, so it is hidden
              from assistive tech rather than read out twice. */}
          <Link
            href={FORM}
            aria-hidden
            tabIndex={-1}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-brand-secondary-100 bg-brand-secondary-100 text-brand-800 shadow-xs transition-colors hover:border-brand-secondary-200 hover:bg-brand-secondary-200"
          >
            <Icon name="edit-03" className="size-5" />
          </Link>
        </div>
      </section>

      {/* --- Completion (11:4976) -------------------------------------- */}
      <section className="overflow-hidden rounded-2xl bg-card pb-2 shadow-xs">
        {/* The rule is an inset shadow so the head stays exactly 94px;
            a border would make it 95. */}
        <div className="p-6 shadow-[inset_0_-1px_0_0_var(--color-line)]">
          <h2 className="text-lg font-semibold leading-7 text-ink-strong">
            Profile Completion
          </h2>
          <span className="flex h-[18px] items-center gap-1.5 text-xs leading-[18px] text-ink-subtle">
            <Icon name="info-circle" className="size-4 shrink-0" />
            Complete or edit sections of your profile
          </span>
        </div>

        <ul>
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
  const done = section.completed;

  return (
    /* The hairline is an inset shadow so each row stays exactly 68px; a
       border would add one pixel per row over eight of them. */
    <li className="flex min-h-[68px] flex-wrap items-center gap-y-3 px-6 py-4 shadow-[inset_0_-1px_0_0_var(--color-line-soft)] last:shadow-none">
      <span className="flex w-64 min-w-44 shrink-0 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full",
            done
              ? "bg-status-green-bg text-section-done-icon"
              : "bg-canvas text-ink-subtle",
          )}
        >
          <Icon
            name={SECTION_ICONS[section.slug] ?? "file"}
            className="size-3"
          />
        </span>
        <span className="truncate text-base font-semibold leading-6 text-ink-body">
          {section.label}
        </span>
      </span>

      {/* Green once finished, brand while in progress: the colour is the
          fastest read on this page, so it carries the same meaning as the
          word beside it rather than a second one. */}
      <span className="flex min-w-44 flex-1 items-center gap-3 px-5">
        <span
          aria-hidden
          className="h-2 flex-1 overflow-hidden rounded-full bg-line"
        >
          <span
            className={cn(
              "block h-full rounded-full transition-[width] duration-500",
              done ? "bg-section-done" : "bg-brand-700",
            )}
            style={{ width: `${Math.min(Math.max(section.progress, 0), 100)}%` }}
          />
        </span>
        <span className="shrink-0 text-sm font-medium leading-5 tabular-nums text-ink-muted">
          {section.progress}%
        </span>
      </span>

      {done ? (
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold leading-5 text-section-done">
            Completed!
          </span>
          <Link
            href={href}
            aria-label={`Edit ${section.label}`}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-brand-secondary-100 bg-brand-secondary-100 text-brand-800 shadow-xs transition-colors hover:border-brand-secondary-200 hover:bg-brand-secondary-200"
          >
            <Icon name="edit-05" className="size-5" />
          </Link>
        </span>
      ) : (
        <Link
          href={href}
          className="group inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-brand-secondary-100 bg-brand-secondary-100 px-3.5 text-sm font-semibold leading-5 text-brand-800 shadow-xs transition-colors hover:border-brand-secondary-200 hover:bg-brand-secondary-200"
        >
          Edit section
          <Icon
            name="chevron-right"
            className="size-5 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </li>
  );
}
