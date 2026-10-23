import type { Metadata } from "next";

import { MessageAction, MessagePage } from "@/components/message-page";

export const metadata: Metadata = {
  title: "Signed out",
  description:
    "You were signed out of the Magnum Opus Consultants careers portal after a period of inactivity.",
  // Nothing to index: this page only means anything to the person it just
  // happened to.
  robots: { index: false, follow: false },
};

/**
 * Shown after an automatic sign-out.
 *
 * The point is to answer the question somebody asks when a page they were
 * using turns into a sign-in screen: did something break, or did I do
 * something wrong? Neither — so say plainly that it was the inactivity
 * timer, and that nothing they saved is lost.
 *
 * One action, back to sign-in, as the brief has it. No "go home" alternative:
 * whoever lands here was in the middle of something and wants to get back to
 * it, not to the front door.
 */
export default function SignedOutPage() {
  return (
    <MessagePage
      eyebrow="Signed out"
      title="You were signed out"
      body={
        <>
          <p>
            You had not used the portal for a while, so we signed you out to
            keep your details safe. This happens on every account and is not
            something you did wrong.
          </p>
          <p className="mt-4">
            Anything you saved is still there. Sign in again and you will pick
            up where you left off.
          </p>
        </>
      }
      actions={<MessageAction href="/signin">Sign in again</MessageAction>}
      footnote={
        <p>
          If you are using a shared computer, closing the browser signs you out
          as well — leave &ldquo;Remember me&rdquo; unticked when you sign in.
        </p>
      }
    />
  );
}
