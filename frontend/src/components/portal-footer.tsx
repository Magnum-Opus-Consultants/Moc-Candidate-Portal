import Link from "next/link";

import { Logo } from "@/components/logo";
import { Icon } from "@/components/ui/icon";

/**
 * The candidate portal footer (frame 116:4197 / 224:19964).
 *
 * A rule, then the lockup on the left and four link columns pushed to the
 * right, then a second rule over the copyright line. The frame is not a grid:
 * it is a justify-between row whose right half is four 56px-apart columns, so
 * the columns stay bunched at the right edge however wide the content column
 * gets.
 *
 * Everything in "Explore MOC", "Help" and "Follow us" leaves for the public
 * site, so those are plain anchors with rel="noreferrer" rather than Next
 * links; only the portal's own legal pages route internally.
 */

const SITE = "https://www.moc-pty.com";

/* Read once on import rather than per render: calling new Date() while
   a page prerenders is an unstable value, and Next rejects it. */
const YEAR = new Date().getFullYear();

const COLUMNS: Array<{
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}> = [
  {
    title: "Explore MOC",
    links: [
      { label: "About us", href: `${SITE}/about-us`, external: true },
      {
        label: "Global talent solutions",
        href: `${SITE}/global-talent-solutions`,
        external: true,
      },
      { label: "Our blog", href: `${SITE}/blog`, external: true },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "FAQs", href: `${SITE}/faqs`, external: true },
      { label: "Get in touch", href: `${SITE}/contact`, external: true },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "info@moc-pty.com", href: "mailto:info@moc-pty.com" },
      { label: "+27 76 740 1777", href: "tel:+27767401777" },
    ],
  },
  {
    title: "Follow us",
    links: [
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/company/magnum-opus-consultants",
        external: true,
      },
      {
        label: "Facebook",
        href: "https://www.facebook.com/magnumopusconsultants",
        external: true,
      },
    ],
  },
];

const LINK = "text-sm leading-5 text-ink-subtle transition-colors hover:text-ink-strong";

export function PortalFooter() {
  return (
    <footer className="flex w-full flex-col gap-6 border-t border-line pb-6 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-x-14 gap-y-8">
        <div className="flex flex-col gap-3">
          <Logo href={null} className="h-[55px]" />
          <p className="text-sm leading-5 text-ink-subtle">
            Talent that drives value
          </p>
          <a
            href={SITE}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-semibold leading-5 text-brand-700 transition-colors hover:text-brand-800"
          >
            Visit moc-pty.com
            <Icon name="arrow-up-right" className="size-4 shrink-0" />
          </a>
        </div>

        <div className="flex flex-wrap items-start gap-x-14 gap-y-8">
          {COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-2.5">
              <h3 className="text-sm font-semibold leading-5 text-ink-strong">
                {column.title}
              </h3>
              {column.links.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className={LINK}
                  >
                    {link.label}
                  </a>
                ) : (
                  <a key={link.href} href={link.href} className={LINK}>
                    {link.label}
                  </a>
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs leading-[18px]">
        <p className="text-ink-faint">
          &copy; {YEAR} Magnum Opus Consultants. All rights
          reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="font-medium text-ink-subtle hover:text-ink-strong">
            Privacy policy
          </Link>
          <span aria-hidden className="text-ink-ghost">
            &middot;
          </span>
          <Link href="/terms" className="font-medium text-ink-subtle hover:text-ink-strong">
            Terms of use
          </Link>
        </div>
      </div>
    </footer>
  );
}
