"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/**
 * Save / unsave a job. Toggles for a signed-in seeker; an anonymous visitor is
 * sent to sign in (the backend answers 401, which is the cue).
 */
export function SaveButton({
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
      aria-label={saved ? "Saved — tap to remove" : "Save this job"}
      className={cn(
        "rounded-full border p-2.5 transition-colors",
        saved
          ? "border-brand-700 bg-brand-50 text-brand-700"
          : "border-line text-ink-muted hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
      )}
    >
      <Icon name="bookmark" />
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
