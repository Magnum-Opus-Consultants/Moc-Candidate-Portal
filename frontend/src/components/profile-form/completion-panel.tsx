"use client";

/**
 * The "Completion progress" panel beside the profile form.
 *
 * Shows the overall ring, the profile-status badge and one row per section,
 * each dot filled once that section is complete. The section rows are links
 * to the matching card, so the panel doubles as the form's navigation.
 */

import { Icon } from "@/components/ui/icon";
import { ProgressCircle } from "@/components/ui/progress-circle";
import {
  PROFILE_STRENGTH,
  StatusBadge,
  cn,
} from "@/components/ui/primitives";
import { API_BASE_URL, type ProfileSection } from "@/lib/api";

export function CompletionPanel({
  completion,
  strength,
  sections,
  saving,
  dirty,
  onSave,
  error,
  saved,
  brandedCv = false,
}: {
  completion: number;
  strength: string;
  sections: ProfileSection[];
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  error: string | null;
  saved: boolean;
  /**
   * Show the MOC-branded CV download under the panel.
   *
   * Only on "My Profile". The creation flow is for a seeker who has just
   * signed up and is nowhere near the 80% gate, so offering a download they
   * cannot use would be noise.
   */
  brandedCv?: boolean;
}) {
  const tone = PROFILE_STRENGTH[strength] ?? PROFILE_STRENGTH.getting_started;

  return (
    <aside
      /*
       * Follows the form down. The offset clears the portal's own sticky
       * header, and max-height + overflow keep the panel usable on a short
       * window — without them a tall panel pins with its foot, and the Save
       * button ends up below the fold.
       *
       * The grey trough and 16px radius are the frame's: the panel is a
       * block beside the form, not another white card like the sections it
       * is listing.
       */
      className="rounded-2xl bg-trough px-6 py-8 lg:sticky lg:top-[76px] lg:max-h-[calc(100dvh-100px)] lg:overflow-y-auto"
    >
      <div className="space-y-4">
        <h2 className="text-center text-2xl font-semibold leading-8 text-ink-strong">
          Completion progress
        </h2>
        <hr className="border-t-2 border-line-strong" />
      </div>

      <div className="mt-6 flex flex-col items-center gap-6">
        <ProgressCircle
          value={completion}
          size="3xl"
          tone="trough"
          label="Profile completion"
          title="Profile completion"
        />

        {/* The status pill: a light capsule carrying the label and the
            strength badge, rather than a plain row on the panel. */}
        <div className="flex w-full items-center justify-between gap-2 rounded-2xl bg-card py-1 pl-3 pr-1">
          <span className="text-xs font-medium text-ink-muted">Profile status</span>
          <StatusBadge label={tone.label} tone={tone.tone} />
        </div>
      </div>

      <ul className="mt-6 space-y-2">
        {sections.map((section) => (
          <li key={section.slug}>
            <a
              href={`#${section.slug}`}
              className="flex items-center gap-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink-strong"
            >
              <span
                aria-hidden
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  section.completed
                    ? "bg-status-green"
                    : section.progress > 0
                      ? "bg-status-yellow"
                      : "bg-line-strong",
                )}
              />
              <span className="flex-1">{section.label}</span>
              {section.progress > 0 && !section.completed ? (
                <span className="text-xs font-normal text-ink-subtle">
                  {section.progress}%
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSave}
        disabled={saving || !dirty}
        className="mt-6 w-full rounded-lg border border-brand-secondary bg-brand-secondary px-3.5 py-2 text-sm font-semibold text-brand-secondary-ink shadow-xs transition-colors hover:border-brand-secondary-hover hover:bg-brand-secondary-hover disabled:border-line-strong disabled:bg-line-strong disabled:text-ink-subtle"
      >
        {/* "Saved" only once something actually has been — before the first
            edit the button is simply disabled. */}
        {saving ? "Saving…" : !dirty && saved ? "Saved" : "Save changes"}
      </button>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-status-rose">
          {error}
        </p>
      ) : null}
      {saved && !dirty && !error ? (
        <p className="mt-2 text-center text-xs text-status-green">
          Your profile has been saved.
        </p>
      ) : null}

      {brandedCv ? <BrandedCv completion={completion} /> : null}
    </aside>
  );
}

/** The 80% reward, per the SOW: a CV on MOC letterhead. */
function BrandedCv({ completion }: { completion: number }) {
  const unlocked = completion >= 80;
  return (
    <div className="mt-5 border-t border-line pt-5">
      <p className="text-sm leading-relaxed text-ink-muted">
        {unlocked
          ? "You can download your MOC-branded CV."
          : `The MOC-branded CV unlocks at 80% — ${80 - completion}% to go.`}
      </p>
      {unlocked ? (
        <a
          href={`${API_BASE_URL}/api/candidate/cv/`}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-800"
        >
          <Icon name="download" className="size-4" />
          Download branded CV
        </a>
      ) : (
        <span
          aria-disabled
          className="mt-3 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-line bg-card-muted px-4 py-2.5 text-sm font-medium text-ink-subtle"
        >
          <Icon name="download" className="size-4" />
          Download branded CV
        </span>
      )}
    </div>
  );
}
