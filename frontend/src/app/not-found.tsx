import type { Metadata } from "next";

import {
  MessageAction,
  MessageLink,
  MessagePage,
} from "@/components/message-page";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page does not exist on the Magnum Opus Consultants portal.",
};

/**
 * 404.
 *
 * Offers the two things somebody who lands here actually wants — the job
 * board, or their own portal — rather than only apologising. A dead end
 * with no way onward is the real failure, not the missing URL.
 */
export default function NotFound() {
  return (
    <MessagePage
      eyebrow="Error 404"
      title="We could not find that page"
      body={
        <>
          The page you are looking for does not exist or has moved. The link
          may be out of date, or a position may have closed and been taken
          down since you last saw it.
        </>
      }
      actions={
        <>
          <MessageAction href="/">Browse open positions</MessageAction>
          <MessageLink href="/portal">Go to my portal</MessageLink>
        </>
      }
      footnote={
        <>
          If you believe this is an error, please contact{" "}
          <a
            href="mailto:careers@moc-pty.com"
            className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            careers@moc-pty.com
          </a>
          .
        </>
      }
    />
  );
}
