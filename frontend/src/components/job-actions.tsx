"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BookmarkFilled, Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/**
 * Save / unsave a job. Toggles for a signed-in seeker; an anonymous visitor is
 * sent to sign in (the backend answers 401, which is the cue).
 */
export function SaveButton({
  jobId,
  initialSaved = false,
  compact = false,
}: {
  jobId: number;
  initialSaved?: boolean;
  /** Borderless, for the corner of a card that has its own border. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const result = await api.toggleSave(jobId);
    setBusy(false);
    if (result.ok) {
      setSaved(result.data.saved);
    } else if (result.status === 401 || result.status === 403) {
      router.push("/signin");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? "Saved — tap to remove" : "Save this job"}
      className={cn(
        "rounded-full transition-colors disabled:opacity-60",
        compact ? "p-1.5" : "border p-2.5",
        saved
          ? compact
            ? "bg-brand-50 text-brand-700"
            : "border-brand-700 bg-brand-50 text-brand-700"
          : compact
            ? "text-ink-subtle hover:bg-card-muted hover:text-brand-700"
            : "border-line text-ink-muted hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
      )}
    >
      {saved ? <BookmarkFilled /> : <Icon name="bookmark" />}
    </button>
  );
}

/** The text "Save for later" button used on a job's own page. */
export function SaveForLaterButton({
  jobId,
  initialSaved = false,
}: {
  jobId: number;
  initialSaved?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const result = await api.toggleSave(jobId);
    setBusy(false);
    if (result.ok) {
      setSaved(result.data.saved);
    } else if (result.status === 401 || result.status === 403) {
      router.push("/signin");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors",
        saved
          ? "border-brand-700 bg-brand-50 text-brand-700"
          : "border-line bg-card text-ink hover:border-line-strong",
      )}
    >
      <Icon name="bookmark" className="size-3.5" />
      {saved ? "Saved" : "Save for later"}
    </button>
  );
}

/**
 * Share a job: the native share sheet where available, otherwise copy the link
 * and show a brief tick.
 */
export function ShareButton({ jobId }: { jobId: number }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/jobs/${jobId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Magnum Opus Consultants — role", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* user dismissed the share sheet, or clipboard blocked — nothing to do */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? "Link copied" : "Share this job"}
      className="rounded-full border border-line p-2.5 text-ink-muted transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
    >
      <Icon name={copied ? "check" : "share"} />
    </button>
  );
}

/**
 * Apply for a job in one step (Development Plan, Day 5).
 *
 * The application carries the seeker's saved profile; the server enforces
 * one per position and answers 409 if they have already applied, which is
 * shown rather than swallowed. An anonymous visitor is sent to sign in, and
 * a seeker without a profile to the profile form, because that is what the
 * backend asks for.
 */
export function ApplyButton({
  jobId,
  initialApplied = false,
  className,
  children = "Apply now",
}: {
  jobId: number;
  initialApplied?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [applied, setApplied] = useState(initialApplied);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function apply() {
    setBusy(true);
    setMessage(null);
    setFailed(false);

    const result = await api.applyToJob(jobId);
    setBusy(false);

    if (result.ok) {
      setApplied(true);
      setMessage(result.data.detail);
      router.refresh();
      return;
    }

    if (result.status === 401 || result.status === 403) {
      router.push(`/signin?next=/jobs/${jobId}`);
      return;
    }
    if (result.status === 409 && /profile/i.test(result.error)) {
      router.push("/portal/profile/complete");
      return;
    }
    if (result.status === 409) {
      // Already applied, or the posting closed while the page was open.
      setApplied(/already applied/i.test(result.error));
    }
    setFailed(true);
    setMessage(result.error);
  }

  if (applied) {
    return (
      <span className={cn("inline-flex flex-col items-end gap-1", className)}>
        <span className="rounded-lg bg-brand-100 px-4 py-2 text-sm font-medium text-brand-300">
          Already applied
        </span>
        {message && !failed ? (
          <span role="status" className="text-xs text-status-green">
            {message}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-col items-end gap-1", className)}>
      <button
        type="button"
        onClick={apply}
        disabled={busy}
        className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-800 disabled:bg-brand-100 disabled:text-brand-300"
      >
        {busy ? "Applying…" : children}
      </button>
      {message && failed ? (
        <span role="alert" className="text-xs text-status-rose">
          {message}
        </span>
      ) : null}
    </span>
  );
}
