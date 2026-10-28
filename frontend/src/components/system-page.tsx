import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { SystemBackButton } from "@/components/system-back-button";

/**
 * The frame behind the four system pages — 404, 500, maintenance and the
 * expired session.
 *
 * One component rather than a copy each, so the four cannot drift, and
 * because the frames give them an identical shell: the same top bar, the
 * same tower-sweep graphic bleeding off the right, the same centred column
 * and the same footer.
 *
 * Per the design's developer notes, the copy here is role-neutral. These
 * pages are shared by both portals, so nothing may say "dashboard", "jobs"
 * or "profile" — the reader could be either, or signed out entirely.
 *
 * It makes no API call. A maintenance page is shown precisely when the
 * backend is unreachable, so the shell must render from nothing.
 */

/*
 * Read once at module load rather than per render: calling new Date()
 * during a render is unstable and blocks prerendering.
 */
const COPYRIGHT_YEAR = new Date().getFullYear();

export function SystemPage({
  numeral,
  icon,
  title,
  body,
  actions,
  note,
  back = false,
  supportSubject,
}: {
  /** The oversized status code on the 404 and 500 frames. */
  numeral?: string;
  /** The featured icon the maintenance and session frames use instead. */
  icon?: ReactNode;
  title: string;
  body: ReactNode;
  actions?: ReactNode;
  /** The small line under the actions — the auto-refresh note. */
  note?: ReactNode;
  /**
   * Show the back button at the top left.
   *
   * Only the 404 and 500 frames have it. Maintenance and the expired
   * session deliberately do not: going back cannot help while the platform
   * is down, and the previous page needs a login.
   */
  back?: boolean;
  /** Pre-fills the support email, so the reader does not retype the problem. */
  supportSubject?: string;
}) {
  const support = supportSubject
    ? `mailto:careers@moc-pty.com?subject=${encodeURIComponent(supportSubject)}`
    : "mailto:careers@moc-pty.com";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      {/*
       * The tower sweep, bleeding off the right edge as the frames have it.
       * Decorative, so it is hidden from assistive tech and never intercepts
       * a click. Hidden on small screens, where it would crowd the column
       * rather than frame it.
       */}
      <img
        src="/system/tower-sweep.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -top-12 left-[57%] hidden h-[1452px] w-[726px] max-w-none select-none md:block"
      />

      <header className="relative border-b border-line bg-card">
        <div className="flex h-[68px] items-center justify-between px-5 sm:px-8">
          <Logo href="/" className="h-9" />
          <p className="flex items-center gap-1.5 text-sm">
            <span className="text-ink-muted">Need help?</span>
            <a
              href={support}
              className="font-semibold text-brand-700 transition-colors hover:text-brand-800"
            >
              Contact support
            </a>
          </p>
        </div>
      </header>

      {back ? (
        <div className="relative px-5 pt-6 sm:px-8">
          <SystemBackButton />
        </div>
      ) : null}

      <main className="relative flex flex-1 items-center justify-center px-5 py-12">
        <div className="flex w-full max-w-[520px] flex-col items-center gap-6 text-center">
          {numeral ? (
            /*
             * The gradient numeral. The frame fills the glyphs with a
             * brand gradient; background-clip does that in CSS and keeps
             * the text selectable and readable by a screen reader, which
             * exporting it as an image would not.
             */
            <p className="bg-gradient-to-br from-brand-600 to-brand-300 bg-clip-text text-[120px] font-semibold leading-none tracking-[-0.04em] text-transparent sm:text-[180px] lg:text-[260px]">
              {numeral}
            </p>
          ) : null}

          {icon}

          <div className="flex flex-col gap-3">
            <h1 className="text-[30px] font-semibold leading-[38px] text-ink-strong">
              {title}
            </h1>
            <div className="text-base leading-6 text-ink-muted">{body}</div>
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {actions}
            </div>
          ) : null}

          {note ? (
            <p className="text-xs leading-[18px] text-ink-subtle">{note}</p>
          ) : null}
        </div>
      </main>

      <footer className="relative flex h-14 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 text-xs leading-[18px]">
        <span className="text-ink-subtle">
          © {COPYRIGHT_YEAR} Magnum Opus Consultants. All rights reserved.
        </span>
        <span aria-hidden className="text-line-strong">
          ·
        </span>
        <Link
          href="/privacy"
          className="inline-flex min-h-6 items-center font-medium text-ink-muted transition-colors hover:text-ink"
        >
          Privacy policy
        </Link>
        <span aria-hidden className="text-line-strong">
          ·
        </span>
        <Link
          href="/terms"
          className="inline-flex min-h-6 items-center font-medium text-ink-muted transition-colors hover:text-ink"
        >
          Terms of use
        </Link>
      </footer>
    </div>
  );
}

/** The filled action, in the rail's secondary teal as the frames draw it. */
export function SystemAction({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const className =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-brand-secondary bg-brand-secondary px-4 py-2.5 text-sm font-semibold text-brand-secondary-ink shadow-xs transition-colors hover:border-brand-secondary-hover hover:bg-brand-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

/** The 96px circle the maintenance and session frames lead with. */
export function SystemIcon({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="grid size-24 place-items-center rounded-full bg-brand-50 text-brand-700"
    >
      {children}
    </span>
  );
}
