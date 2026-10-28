import type { Metadata } from "next";

import { SystemAction, SystemPage } from "@/components/system-page";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page does not exist on the Magnum Opus Consultants portal.",
};

/**
 * 404.
 *
 * The copy is deliberately role-neutral, per the design's developer notes:
 * this page is shared by the candidate and hiring-manager portals and by
 * signed-out visitors, so it cannot name a dashboard, a job list or a
 * profile. "Go to home page" lands on the public board, which every one of
 * those three can use and which routes a signed-in reader onward.
 *
 * Support is offered only in the header, as the notes require, and the
 * mail link carries the subject so nobody has to describe the problem.
 */
export default function NotFound() {
  return (
    <SystemPage
      back
      numeral="404"
      title="Page not found"
      supportSubject="Page not found on the MOC Candidate Portal"
      body={
        <>
          This page doesn&rsquo;t exist or may have been moved.
          <br />
          Go back to where you were, or head to your home page.
        </>
      }
      actions={
        <SystemAction href="/">
          <Icon name="home" className="size-5" />
          Go to home page
        </SystemAction>
      }
    />
  );
}
