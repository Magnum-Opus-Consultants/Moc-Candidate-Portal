"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { Button, JOB_STATUS_TONE, TONE_CLASS, cn } from "@/components/ui/primitives";
import { api, type JobStatusAction } from "@/lib/api";

/**
 * Pause, close, make private, or put a posting back on the board.
 *
 * The backend has had these transitions all along — nothing in the UI ever
 * called them, so a manager could publish a job but never take it down
 * again except by deleting it, which is refused once anyone has applied.
 *
 * Two layouts. "panel" is the frame's: the current status as a dropdown
 * with the other states inside it, and Close Job on its own underneath,
 * because closing is the one move that ends the posting and should not sit
 * in a list with the reversible ones. "inline" is the plain row, for
 * anywhere that has no panel to sit in.
 *
 * Publishing is folded into the dropdown as "Active" rather than kept as a
 * separate button: from the manager's point of view it is the same
 * question — what state is this posting in — even though the server
 * validates that one move and not the others.
 */

type Move = {
  action: JobStatusAction | "publish";
  label: string;
  icon: IconName;
  /** Which statuses this move is offered from. */
  from: string[];
  /** Said before it happens, where the consequence is not obvious. */
  confirm?: string;
};

const MOVES: Move[] = [
  {
    action: "publish",
    label: "Active",
    icon: "check",
    from: ["draft", "paused", "private", "closed"],
  },
  {
    action: "pause",
    label: "Paused",
    icon: "clock",
    from: ["active"],
    confirm:
      "Pause this posting? It stays on the board but stops taking new applications.",
  },
  {
    action: "private",
    label: "Private",
    icon: "archive",
    from: ["active", "paused", "draft"],
    confirm:
      "Make this posting private? It comes off the public board. You keep its applicants and its suggested candidates.",
  },
  {
    action: "draft",
    label: "Draft",
    icon: "edit",
    from: ["private", "paused", "closed"],
  },
];

const CLOSE: Move = {
  action: "close",
  label: "Close Job",
  icon: "close",
  from: ["active", "paused", "private", "draft"],
  confirm:
    "Close this posting? It comes off the board and stops taking applications. You can reopen it later.",
};

export function JobStatusActions({
  jobId,
  status,
  statusLabel,
  layout = "inline",
}: {
  jobId: number;
  status: string;
  /** The server's wording for the current status, e.g. "Active". */
  statusLabel?: string;
  layout?: "inline" | "panel";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<Move | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function away(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function run(move: Move) {
    setPending(null);
    setOpen(false);
    setBusy(move.action);
    setError(null);

    const result =
      move.action === "publish"
        ? await api.publishJob(jobId)
        : await api.setJobStatus(jobId, move.action);
    setBusy(null);

    if (result.ok) {
      // The badge, the board and the applicant tabs all read from the
      // server, so refresh rather than patching any of them here.
      router.refresh();
      return;
    }
    if (result.status === 401 || result.status === 403) {
      router.push("/signin");
      return;
    }
    setError(result.error);
  }

  function choose(move: Move) {
    if (move.confirm) setPending(move);
    else void run(move);
  }

  const available = MOVES.filter((move) => move.from.includes(status));
  const canClose = CLOSE.from.includes(status);

  const confirmBox = pending ? (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card-muted px-3 py-2">
      <span className="text-xs leading-relaxed text-ink-muted">
        {pending.confirm}
      </span>
      <button
        type="button"
        onClick={() => void run(pending)}
        className="text-xs font-semibold text-brand-700 underline underline-offset-2"
      >
        Yes, {pending.label.toLowerCase()}
      </button>
      <button
        type="button"
        onClick={() => setPending(null)}
        className="text-xs text-ink-subtle underline underline-offset-2"
      >
        Cancel
      </button>
    </div>
  ) : null;

  const errorBox = error ? (
    <p role="alert" className="text-xs text-status-rose">
      {error}
    </p>
  ) : null;

  if (layout === "panel") {
    const tone = TONE_CLASS[JOB_STATUS_TONE[status] ?? "grey"];
    return (
      <>
        <div ref={box} className="relative">
          <button
            type="button"
            disabled={busy !== null || available.length === 0}
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors disabled:opacity-60",
              tone.bg,
              tone.text,
              "border-current/20",
            )}
          >
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {busy ? "Saving…" : (statusLabel ?? status)}
            {available.length > 0 ? (
              <Icon name="chevron-down" className="ml-auto size-4" />
            ) : null}
          </button>

          {open ? (
            <div
              role="listbox"
              className="absolute left-0 right-0 top-11 z-20 overflow-hidden rounded-lg border border-line bg-card py-1 shadow-lg"
            >
              {available.map((move) => (
                <button
                  key={move.action}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => choose(move)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-card-muted"
                >
                  <Icon name={move.icon} className="size-3.5 text-ink-subtle" />
                  {move.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {canClose ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => choose(CLOSE)}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-status-rose px-3 text-sm font-medium text-status-rose transition-colors hover:bg-status-rose-bg disabled:opacity-60"
          >
            <Icon name="close" className="size-3.5" />
            {busy === "close" ? "Closing…" : "Close Job"}
          </button>
        ) : null}

        {confirmBox}
        {errorBox}
      </>
    );
  }

  if (available.length === 0 && !canClose) return null;

  return (
    <>
      {[...available, ...(canClose ? [CLOSE] : [])].map((move) => (
        <Button
          key={move.action}
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => choose(move)}
        >
          <Icon name={move.icon} className="size-3.5" />
          {busy === move.action ? "Saving…" : move.label}
        </Button>
      ))}
      {confirmBox}
      {errorBox}
    </>
  );
}
