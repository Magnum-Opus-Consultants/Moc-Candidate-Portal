"use client";

import { useEffect } from "react";

import { SystemAction, SystemPage } from "@/components/system-page";
import { Icon } from "@/components/ui/icon";

/**
 * 500 — something went wrong on our side.
 *
 * Next renders this when a route throws. It must be a client component and
 * must take `reset`, which is what "Try again" calls: it re-renders the
 * failed route in place rather than doing a full page load, so a reader who
 * was part-way through a form keeps what they had typed. The design's
 * developer notes ask for exactly that — "don't lose form input".
 *
 * The notes also ask for a real error reference. Next supplies one on the
 * server as `error.digest`, a hash of the underlying error, and it is the
 * only thing that ties what the reader saw to a line in the server log.
 * It is shown, and carried into the support mail so nobody has to read a
 * hex string down the phone.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is on the server's copy; the browser's console is where
    // this one is useful while developing.
    console.error(error);
  }, [error]);

  const reference = error.digest;

  return (
    <SystemPage
      back
      numeral="500"
      title="Something went wrong on our side"
      supportSubject={
        reference
          ? `MOC Candidate Portal error (reference ${reference})`
          : "MOC Candidate Portal error"
      }
      body={
        <>
          This wasn&rsquo;t caused by anything you did.
          <br />
          Go back to where you were, or try again in a moment.
        </>
      }
      actions={
        <SystemAction onClick={reset}>
          <Icon name="refresh" className="size-5" />
          Try again
        </SystemAction>
      }
      note={
        reference ? (
          <>
            Error reference <code className="font-mono">{reference}</code> —
            quote it if you contact support.
          </>
        ) : null
      }
    />
  );
}
