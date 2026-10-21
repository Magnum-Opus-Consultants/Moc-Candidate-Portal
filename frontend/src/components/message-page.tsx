import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";

/**
 * The frame behind the whole-page messages — not found, maintenance.
 *
 * One component rather than a copy each, so the two cannot drift.
 *
 * Deliberately plain. An earlier version put a large tinted icon badge
 * above the heading and used amber for maintenance; both read as
 * decoration on a page a candidate reaches when something has gone wrong,
 * and the amber belonged to no part of the brand. This is typographic:
 * the same petrol blue, the same card and rules as the rest of the portal,
 * and nothing on the page that is not doing work.
 *
 * It makes no API call. A maintenance page is shown precisely when the
 * backend is unreachable, so it must render from nothing.
 */

/*
 * Read once at module load rather than per render: calling new Date()
 * during a render is unstable and blocks prerendering.
 */
const COPYRIGHT_YEAR = new Date().getFullYear();

export function MessagePage({
  eyebrow,
  title,
  body,
  actions,
  footnote,
}: {
  /** The small line above the heading — a status code, or a state. */
  eyebrow: string;
  title: string;
  body: ReactNode;
  actions?: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
          <Logo href="/" className="h-8" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">
          {/* A rule rather than a badge: it separates without decorating. */}
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
            {eyebrow}
          </p>

          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-ink-strong sm:text-[40px]">
            {title}
          </h1>

          <div className="mt-4 max-w-lg text-base leading-relaxed text-ink-muted">
            {body}
          </div>

          {actions ? (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {actions}
            </div>
          ) : null}

          {footnote ? (
            <div className="mt-10 border-t border-line pt-6 text-sm leading-relaxed text-ink-subtle">
              {footnote}
            </div>
          ) : null}
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

/** The filled action on a message page. */
export function MessageAction({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-700 px-5 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      {children}
    </Link>
  );
}

/** The quiet one beside it. */
export function MessageLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center rounded-lg border border-line-strong bg-card px-5 text-sm font-semibold text-ink transition-colors hover:bg-card-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      {children}
    </Link>
  );
}
