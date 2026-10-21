import type { Metadata } from "next";

import { MessagePage } from "@/components/message-page";

export const metadata: Metadata = {
  title: "Back soon",
  description:
    "The Magnum Opus Consultants careers portal is briefly unavailable while we carry out an update.",
  // Nothing here should be indexed: it is a temporary state, and a search
  // engine that caches it will keep showing it after the work is done.
  robots: { index: false, follow: false },
};

/**
 * The maintenance page.
 *
 * Shown while the portal is down for planned work. It renders from nothing
 * — no API call, no session — because the whole point is that it still
 * works when the backend does not.
 *
 * No links into the portal: every one of them would fail while this page
 * is up, and a button that fails is worse than no button. The page answers
 * the three questions somebody stuck here has, in the order they ask them:
 * is my work safe, how long, and who do I speak to.
 */
export default function MaintenancePage() {
  return (
    <MessagePage
      eyebrow="Maintenance in progress"
      title="Back soon"
      body={
        <>
          <p>
            We are carrying out a short update to the careers portal, so it is
            unavailable for the moment.
          </p>
          <p className="mt-4">
            Nothing is lost. Your profile, your saved positions and every
            application you have made are untouched, and the closing date on
            any position you were part-way through has not moved.
          </p>
          <p className="mt-4">
            Most updates take well under an hour. Refresh this page and it
            will take you straight back in once we are done.
          </p>
        </>
      }
      footnote={
        <p>
          If something cannot wait, our team is on{" "}
          <a
            href="mailto:careers@moc-pty.com"
            className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            careers@moc-pty.com
          </a>{" "}
          and{" "}
          <a
            href="tel:+27767401777"
            className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            +27 76 740 1777
          </a>
          , weekdays 08:00 to 17:00.
        </p>
      }
    />
  );
}
