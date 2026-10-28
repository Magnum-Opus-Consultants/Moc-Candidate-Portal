import type { Metadata } from "next";

import { SystemAction, SystemIcon, SystemPage } from "@/components/system-page";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Session expired",
  description:
    "You were signed out of the Magnum Opus Consultants careers portal after a period of inactivity.",
  // Nothing to index: this page only means anything to the person it just
  // happened to.
  robots: { index: false, follow: false },
};

/**
 * Session expired.
 *
 * No back button, per the design's developer notes: the previous page needs
 * a login, so going back would only land here again.
 *
 * One page for both roles. The notes are explicit that the sign-in screen
 * decides which portal somebody comes back to, which is why nothing here
 * mentions a dashboard or a job list.
 *
 * `?next=` carries the page they were on into sign-in, so "Log in again"
 * returns them to it rather than to a generic home. The idle timer sets it
 * when it redirects here.
 */
export default async function SignedOutPage({
  searchParams,
}: PageProps<"/signed-out">) {
  const query = (await searchParams) as { next?: string };

  // Only an in-app path is forwarded. A full URL here would be an open
  // redirect — somebody could mail a staff member a link to this page
  // pointing "Log in again" at a site of their choosing.
  const next =
    typeof query.next === "string" &&
    query.next.startsWith("/") &&
    !query.next.startsWith("//")
      ? query.next
      : null;

  return (
    <SystemPage
      icon={
        <SystemIcon>
          <Icon name="clock" className="size-10" />
        </SystemIcon>
      }
      title="Your session has expired"
      supportSubject="MOC Candidate Portal — session expired"
      body={
        <>
          You were signed out after a period of inactivity, to keep your
          details safe.
          <br />
          Anything you saved is still there.
        </>
      }
      actions={
        <SystemAction href={next ? `/signin?next=${encodeURIComponent(next)}` : "/signin"}>
          Log in again
        </SystemAction>
      }
      note="On a shared computer, closing the browser signs you out as well."
    />
  );
}
