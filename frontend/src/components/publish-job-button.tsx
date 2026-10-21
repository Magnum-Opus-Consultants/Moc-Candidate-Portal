"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/**
 * Publish a posting (Development Plan, Day 11).
 *
 * Publishing sets the posting to Active, which is what puts it on the public
 * job list and opens it for applications. The server is the authority on
 * whether a draft is complete enough to go live, so a 400 is shown rather
 * than pre-empted here — the create form lets a draft be saved half-finished
 * on purpose.
 */
export function PublishJobButton({
  jobId,
  status,
}: {
  jobId: number;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Closed postings reopen rather than publish, and an active one is already
  // live — both are their own tasks on the board.
  if (status !== "draft" && status !== "private" && status !== "paused") {
    return null;
  }

  async function publish() {
    setBusy(true);
    setError(null);

    const result = await api.publishJob(jobId);
    setBusy(false);

    if (result.ok) {
      // The status badge, the posted date and the public list all read from
      // the server, so refresh rather than patching them here.
      router.refresh();
      return;
    }

    if (result.status === 401 || result.status === 403) {
      router.push("/signin");
      return;
    }

    setError(result.error);
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button variant="primary" size="sm" onClick={publish} disabled={busy}>
        <Icon name="check" className="size-3.5" />
        {busy ? "Publishing…" : "Publish job"}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-status-rose">
          {error}
        </span>
      ) : null}
    </span>
  );
}
