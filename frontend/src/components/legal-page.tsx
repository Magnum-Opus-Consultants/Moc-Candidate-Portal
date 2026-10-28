import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";

/**
 * The frame behind the long-form public pages — privacy, terms.
 *
 * Separate from MessagePage: that one centres a short message on the screen,
 * which is wrong for a document somebody has to read top to bottom. This one
 * is a measured column with the same masthead and footer, so the two feel
 * like the same site without pretending to be the same kind of page.
 *
 * It makes no API call and reads no session. These pages are linked from the
 * Google consent screen, so they must render for someone who has never
 * signed in and may never sign in.
 */

const COPYRIGHT_YEAR = new Date().getFullYear();

export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  /** Shown as "Last updated" — a policy without a date is not much of one. */
  updated: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Logo href="/" className="h-8" />
        </div>
      </header>

      <main className="flex-1 px-6 py-12 sm:py-16">
        <article className="mx-auto w-full max-w-3xl">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ink-strong sm:text-[40px]">
            {title}
          </h1>
          <p className="mt-3 text-sm text-ink-subtle">Last updated {updated}</p>

          <div className="mt-6 text-base leading-relaxed text-ink-muted">
            {intro}
          </div>

          <div className="mt-10 space-y-10">{children}</div>

          <div className="mt-14 border-t border-line pt-6 text-sm text-ink-subtle">
            <Link
              href="/"
              className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
            >
              Back to open positions
            </Link>
          </div>
        </article>
      </main>

      <footer className="border-t border-line bg-card">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-5 text-xs text-ink-subtle">
          <span>© Magnum Opus Consultants {COPYRIGHT_YEAR}</span>
          {/* min-h-6: flex items, so these are their own tap targets rather
              than inline links in running text, and WCAG 2.2 asks for 24px. */}
          <Link
            href="/privacy"
            className="inline-flex min-h-6 items-center transition-colors hover:text-ink"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="inline-flex min-h-6 items-center transition-colors hover:text-ink"
          >
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** One numbered section of a policy. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-ink-strong">
        {heading}
      </h2>
      <div className="mt-3 space-y-4 text-base leading-relaxed text-ink-muted">
        {children}
      </div>
    </section>
  );
}

/** A bulleted list inside a section, styled once rather than per page. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-5">
      {items.map((item, i) => (
        <li key={i} className="list-disc marker:text-ink-subtle">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** A mailto or tel inside policy text. */
export function LegalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
    >
      {children}
    </a>
  );
}
