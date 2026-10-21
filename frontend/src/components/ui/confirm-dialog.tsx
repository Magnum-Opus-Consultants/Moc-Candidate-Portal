"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/primitives";

/**
 * A confirmation dialog for an action that cannot be undone.
 *
 * Built on <dialog>, so the browser supplies the modal behaviour that is
 * tedious and easy to get wrong by hand: focus moves into the dialog and is
 * trapped there, Escape closes it, and the rest of the page is inert to a
 * screen reader rather than merely covered by an overlay.
 *
 * Cancel is the default focus, not Confirm. A dialog that opens with the
 * destructive button focused turns a stray Enter into a deletion.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Escape and the backdrop both mean "no".
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) onCancel();
      }}
      className="max-w-md rounded-2xl border border-line bg-card p-0 text-ink backdrop:bg-black/40 open:animate-none"
    >
      <div className="p-5">
        <h2 className="text-base font-semibold text-ink-strong">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-md bg-status-rose px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
