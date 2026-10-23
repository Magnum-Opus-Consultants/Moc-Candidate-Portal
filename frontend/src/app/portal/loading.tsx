import { LoadingPanel } from "@/components/loading-page";

/**
 * Inside the candidate shell, so the sidebar and masthead stay put and only
 * the content area shows the wait. The full-screen loading page is at the
 * root, for arriving at the portal rather than moving around inside it.
 */
export default function Loading() {
  return (
    <LoadingPanel
      title="Loading your portal"
      body="One moment while we fetch your details."
    />
  );
}
