"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/**
 * Duplicate and Delete on a posting's own page.
 *
 * Edit and Preview are plain links and stay in the page itself; these two
 * change data, so they need a client component, a busy state and somewhere
 * to show what the server said.
 */
export function JobAdminActions({
  jobId,
  title,
  applicantCount,
}: {
  jobId: number;
  title: string;
  applicantCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"duplicate" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function duplicate() {
    setBusy("duplicate");
    setError(null);

    const result = await api.duplicateJob(jobId);
    setBusy(null);

    if (result.ok) {
      // Land on the copy, which is where the manager wants to be editing.
      router.push(`/manager/jobs/${result.data.job.id}`);
      router.refresh();
      return;
    }
    if (result.status === 401 || result.status === 403) {
      router.push("/signin");
      return;
    }
    setError(result.error);
  }

  async function remove() {
    setBusy("delete");
    setError(null);

    const result = await api.deleteJob(jobId);
    setBusy(null);

    if (result.ok) {
      router.push("/manager/jobs");
      router.refresh();
      return;
    }
    if (result.status === 401 || result.status === 403) {
      router.push("/signin");
      return;
    }
    setConfirming(false);
    setError(result.error);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={duplicate}
        disabled={busy !== null}
      >
        <Icon name="copy" className="size-3.5" />
        {busy === "duplicate" ? "Duplicating…" : "Duplicate"}
      </Button>

      {confirming ? (
        <span className="inline-flex items-center gap-2 rounded-lg border border-status-rose/40 bg-status-rose-bg px-3 py-1.5">
          <span className="text-xs text-status-rose">
            Delete {title} for good?
          </span>
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            className="text-xs font-semibold text-status-rose underline disabled:opacity-60"
          >
            {busy === "delete" ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs font-medium text-ink-muted hover:text-ink"
          >
            Keep
          </button>
        </span>
      ) : (
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          disabled={busy !== null}
        >
          <Icon name="trash" className="size-3.5" />
          Delete
        </Button>
      )}

      {error ? (
        <span role="alert" className="basis-full text-xs text-status-rose">
          {error}
        </span>
      ) : applicantCount > 0 ? (
        <span className="basis-full text-xs text-ink-subtle">
          This posting has applicants, so it can be closed but not deleted —
          their applications and profiles are kept.
        </span>
      ) : null}
    </>
  );
}
