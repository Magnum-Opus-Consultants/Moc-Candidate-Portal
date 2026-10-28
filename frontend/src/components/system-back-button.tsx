"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";

/**
 * The back button at the top left of the 404 and 500 frames.
 *
 * Per the design's developer notes it is browser history, not a route: it
 * returns to wherever the reader actually came from. And when there is no
 * previous page — the link came from an email, a bookmark, or a fresh tab
 * — the button hides rather than sitting there doing nothing. "Go to home
 * page" is still on the page, so nobody is left without a way out.
 *
 * It renders nothing on the server, because whether history exists is a
 * fact about the reader's tab that only the client knows. Rendering it
 * optimistically would show a dead button for one frame to exactly the
 * people it is meant to hide from.
 */
export function SystemBackButton() {
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // history.length counts the current entry, so anything above 1 means
    // there is somewhere to go. A referrer from another page on this site
    // is the same signal when the tab was opened fresh.
    const sameOrigin =
      document.referrer && document.referrer.startsWith(window.location.origin);
    setCanGoBack(window.history.length > 1 || Boolean(sameOrigin));
  }, []);

  if (!canGoBack) return null;

  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      aria-label="Go back to the previous page"
      title="Go back"
      className="grid size-10 place-items-center rounded-lg border border-line-strong bg-card text-ink-muted shadow-xs transition-colors hover:bg-card-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      <Icon name="arrow-left" className="size-5" />
    </button>
  );
}
