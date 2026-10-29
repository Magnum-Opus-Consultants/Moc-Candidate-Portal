import Image from "next/image";
import Link from "next/link";

import horizontal from "../../public/moc-logo-horizontal.png";
import stackedLight from "../../public/moc-logo-stacked-light.png";

/**
 * The Magnum Opus Consultants lighthouse mark and wordmark, as supplied on
 * moc-pty.com. Two cuts: the colour horizontal lockup for light surfaces and
 * the light stacked mark for the deep brand sidebar.
 *
 * The images carry their own intrinsic size, so next/image gets width and
 * height for free and nothing shifts while they load.
 */

export function Logo({
  href = "/",
  className = "h-9",
  label,
}: {
  href?: string | null;
  className?: string;
  /** Optional sub-label, e.g. "Careers", set beside the wordmark. */
  label?: string;
}) {
  const mark = (
    <span className="flex items-center gap-3">
      {/* The lockup is navy artwork, which disappears against the dark rail
          and the dark footer. Flattening and inverting it gives the white
          cut those surfaces need, from the one file. */}
      <Image
        src={horizontal}
        alt="Magnum Opus Consultants"
        priority
        className={`w-auto dark:brightness-0 dark:invert ${className}`}
      />
      {label ? (
        <>
          <span aria-hidden className="h-6 w-px bg-line" />
          <span className="text-sm font-medium text-ink-muted">{label}</span>
        </>
      ) : null}
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      {mark}
    </Link>
  );
}

/** The stacked lighthouse, light cut — for the deep brand sidebar. */
export function LogoMark({
  href = "/",
  className = "size-9",
}: {
  href?: string | null;
  className?: string;
}) {
  const mark = (
    <Image
      src={stackedLight}
      alt="Magnum Opus Consultants"
      className={`w-auto object-contain ${className}`}
    />
  );

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      {mark}
    </Link>
  );
}
