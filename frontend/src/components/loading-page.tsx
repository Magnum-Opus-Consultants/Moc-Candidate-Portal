import { Logo } from "@/components/logo";

/**
 * The loading page.
 *
 * One screen, used wherever the portal or a page is still fetching, in the
 * same typographic style as the 404 and maintenance pages: the mark, a line
 * of text, and nothing that is not doing work. No spinner on a tinted badge
 * and no mascot — this is shown to somebody who is waiting, and decoration
 * reads as delay.
 *
 * The indicator is a ring rather than a bar because it does not know how
 * long it will take, and a progress bar that cannot progress honestly is
 * worse than none. It also carries the brand's own blue, so the page looks
 * like the portal arriving rather than a browser default.
 *
 * It renders from nothing: no API call, no session. A loading page that
 * needed data would be the problem it is meant to cover.
 */

const COPYRIGHT_YEAR = new Date().getFullYear();

export function LoadingPage({
  title = "Loading your portal",
  body = "One moment while we fetch your details.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
          {/* Not a link: there is nowhere useful to go from here, and a
              logo that navigates mid-load invites a double request. */}
          <Logo href={null} className="h-8" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        {/*
          One live region for the whole state. aria-busy tells assistive tech
          that this is a wait rather than the finished page, and polite means
          it is announced once without interrupting.
        */}
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          className="flex max-w-sm flex-col items-center text-center"
        >
          <Ring />

          <p className="mt-7 text-lg font-semibold tracking-tight text-ink-strong">
            {title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
        </div>
      </main>

      <footer className="border-t border-line bg-card">
        <div className="mx-auto max-w-5xl px-6 py-5 text-xs text-ink-subtle">
          © Magnum Opus Consultants {COPYRIGHT_YEAR}
        </div>
      </footer>
    </div>
  );
}

/**
 * The same state, without the frame.
 *
 * A loading.tsx inside /portal or /manager renders *inside* that area's
 * layout, so the sidebar and masthead are already on screen. Using the
 * full page there would put a second logo and a second footer inside the
 * shell. This is the same ring and the same words, sized for a content
 * area instead.
 */
export function LoadingPanel({
  title = "Loading",
  body,
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center"
    >
      <Ring />
      <p className="mt-6 text-base font-semibold tracking-tight text-ink-strong">
        {title}
      </p>
      {body ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
          {body}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A brand-blue arc turning on a quiet track.
 *
 * SVG rather than a bordered div: the track and the arc are the same ring
 * in the design system's progress circle, so this reads as part of the same
 * family instead of a generic spinner. motion-reduce stops the rotation and
 * leaves a static three-quarter ring, which still says "not finished" to
 * anyone who has asked the system for less movement.
 */
function Ring() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden
      className="size-12 animate-spin motion-reduce:animate-none"
    >
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        strokeWidth="4"
        className="stroke-line"
      />
      {/* A quarter of the circumference, so three quarters stays open. */}
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${0.25 * 2 * Math.PI * 20} ${2 * Math.PI * 20}`}
        className="origin-center -rotate-90 stroke-brand-700"
      />
    </svg>
  );
}
