import { LoadingPage } from "@/components/loading-page";

/**
 * Shown while a route segment is still rendering on the server.
 *
 * At the root, so it covers every area that does not define its own: the
 * public board, sign in, the legal pages. /portal and /manager have their
 * own, which keep their shells on screen rather than replacing the whole
 * window with this.
 */
export default function Loading() {
  return (
    <LoadingPage
      title="Loading"
      body="One moment while we fetch the latest positions."
    />
  );
}
