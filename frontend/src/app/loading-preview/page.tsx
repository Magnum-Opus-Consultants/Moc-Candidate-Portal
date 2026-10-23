import { notFound } from "next/navigation";

import { LoadingPage } from "@/components/loading-page";

/**
 * A way to look at the loading page without racing it.
 *
 * The real boundary is gone in a few hundred milliseconds — and on a fast
 * local machine with Next prefetching links, often not shown at all — so
 * there is no reliable way to sit and look at it in the running app. This
 * renders the same component on a fixed URL.
 *
 * Development only: a 404 in production, so a preview route can never end
 * up reachable on the live site.
 */
export default function LoadingPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LoadingPage />;
}
