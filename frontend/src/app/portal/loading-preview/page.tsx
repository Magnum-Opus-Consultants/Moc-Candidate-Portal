import { notFound } from "next/navigation";

import { LoadingPanel } from "@/components/loading-page";

/**
 * The inline variant, inside the candidate shell — the one you get moving
 * between pages in the portal rather than arriving at it.
 *
 * Development only, like its sibling at the root.
 */
export default function PortalLoadingPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <LoadingPanel
      title="Loading your portal"
      body="One moment while we fetch your details."
    />
  );
}
