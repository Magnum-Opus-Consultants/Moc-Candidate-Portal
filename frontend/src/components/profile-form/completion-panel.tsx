"use client";

/**
 * The "Completion progress" panel beside the profile form.
 *
 * Shows the overall ring, the profile-status badge and one row per section,
 * each dot filled once that section is complete. The section rows are links
 * to the matching card, so the panel doubles as the form's navigation.
 */

import { ProgressCircle } from "@/components/ui/progress-circle";
import {
  PROFILE_STRENGTH,
  StatusBadge,
  cn,
} from "@/components/ui/primitives";
import type { ProfileSection } from "@/lib/api";

export function CompletionPanel({
  completion,
  strength,
  sections,
  saving,
  dirty,
  onSave,
  error,
  saved,
}: {
  completion: number;
  strength: string;
  sections: ProfileSection[];
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  error: string | null;
  saved: boolean;
}) {
  const tone = PROFILE_STRENGTH[strength] ?? PROFILE_STRENGTH.getting_started;

  return (
    <aside className="rounded-2xl border border-line bg-card p-6 lg:sticky lg:top-6">
      <h2 className="text-lg font-semibold text-ink-strong">Completion progress</h2>

      <div className="mt-5 flex justify-center">
        <ProgressCircle
          value={completion}
          size="xl"
          label="Profile completion"
          title="Profile completion"
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-xs text-ink-muted">Profile status</span>
        <StatusBadge label={tone.label} tone={tone.tone} />
      </div>

      <ul className="mt-4 space-y-2.5">
        {sections.map((section) => (
          <li key={section.slug}>
            <a
              href={`#${section.slug}`}
              className="flex items-center gap-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  section.completed
                    ? "bg-status-green"
                    : section.progress > 0
                      ? "bg-status-yellow"
                      : "bg-line-strong",
                )}
              />
              <span className="flex-1">{section.label}</span>
              {section.progress > 0 && !section.completed ? (
                <span className="text-xs text-ink-subtle">{section.progress}%</span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSave}
        disabled={saving || !dirty}
        className="mt-5 w-full rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:bg-brand-100 disabled:text-brand-300"
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
    </aside>
  );
}
