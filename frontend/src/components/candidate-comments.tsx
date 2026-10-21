"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, Card, SectionHeading } from "@/components/ui/primitives";
import { api, formatDate, type CandidateComment } from "@/lib/api";

/**
 * Team notes on a candidate (Development Plan, Day 12).
 *
 * Every hiring manager sees every note, which is the point: what one of them
 * learns in an interview — how the person came across, what notice they need
 * — should reach the next manager who opens the profile rather than living
 * in someone's inbox.
 *
 * A note carries its author and cannot be edited, only removed by the person
 * who wrote it. The record of who said what is what makes it worth trusting.
 */
export function CandidateComments({
  candidateId,
  viewerId,
  initial,
}: {
  candidateId: number;
  /** The signed-in manager, so their own notes offer a Remove. */
  viewerId: number | null;
  initial: CandidateComment[];
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const text = body.trim();
    if (!text) return;

    setBusy(true);
    setError(null);

    const result = await api.addCandidateComment(candidateId, text);
    setBusy(false);

    if (result.ok) {
      setComments((rows) => [result.data.comment, ...rows]);
      setBody("");
      router.refresh();
      return;
    }
    if (result.status === 401 || result.status === 403) {
      router.push("/signin");
      return;
    }
    setError(result.error);
  }

  async function remove(commentId: number) {
    setError(null);
    const result = await api.deleteCandidateComment(candidateId, commentId);

    if (result.ok) {
      setComments((rows) => rows.filter((row) => row.id !== commentId));
      router.refresh();
      return;
    }
    setError(result.error);
  }

  return (
    <section>
      <SectionHeading title="Team notes" />
      <Card className="p-5">
        <p className="text-sm text-ink-muted">
          What you add here is visible to every hiring manager who opens this
          candidate.
        </p>

        <div className="mt-3">
          <label htmlFor="candidate-note" className="sr-only">
            Add a note about this candidate
          </label>
          <textarea
            id="candidate-note"
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="How they came across, what stood out, anything the next manager should know."
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            {error ? (
              <span role="alert" className="text-xs text-status-rose">
                {error}
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={add}
              disabled={busy || !body.trim()}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-800 disabled:bg-brand-100 disabled:text-brand-300"
            >
              {busy ? "Saving…" : "Add note"}
            </button>
          </div>
        </div>

        {comments.length === 0 ? (
          <p className="mt-4 border-t border-line pt-4 text-sm text-ink-subtle">
            No notes on this candidate yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3 border-t border-line pt-4">
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-3">
                <Avatar initials={comment.author.initials} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium text-ink-strong">
                      {comment.author.name}
                    </span>
                    <span className="text-xs text-ink-subtle">
                      {formatDate(comment.created_at)}
                    </span>
                    {viewerId === comment.author.id ? (
                      <button
                        type="button"
                        onClick={() => remove(comment.id)}
                        className="ml-auto text-xs text-ink-subtle hover:text-status-rose"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap text-ink-muted">
                    {comment.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
