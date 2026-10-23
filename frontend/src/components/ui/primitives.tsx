/**
 * The shared building blocks from the MOC UI kit.
 *
 * Everything here is presentational and works in light and dark mode. Status
 * colour is decided in one place (STATUS_TONES) so a badge, a dot and a
 * dropdown of the same status never drift apart.
 */

import Link from "next/link";
import type { ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* --- Status tones ---------------------------------------------------------- */

export type Tone =
  | "green"
  | "orange"
  | "purple"
  | "grey"
  | "yellow"
  | "rose"
  | "info";

export const TONE_CLASS: Record<Tone, { bg: string; text: string; dot: string }> = {
  green: {
    bg: "bg-status-green-bg",
    text: "text-status-green",
    dot: "bg-status-green",
  },
  orange: {
    bg: "bg-status-orange-bg",
    text: "text-status-orange",
    dot: "bg-status-orange",
  },
  purple: {
    bg: "bg-status-purple-bg",
    text: "text-status-purple",
    dot: "bg-status-purple",
  },
  grey: { bg: "bg-status-grey-bg", text: "text-status-grey", dot: "bg-status-grey" },
  yellow: {
    bg: "bg-status-yellow-bg",
    text: "text-status-yellow",
    dot: "bg-status-yellow",
  },
  rose: { bg: "bg-status-rose-bg", text: "text-status-rose", dot: "bg-status-rose" },
  info: { bg: "bg-status-info-bg", text: "text-status-info", dot: "bg-status-info" },
};

/** Job status -> tone, matching the Job Status Dropdown in the designs. */
export const JOB_STATUS_TONE: Record<string, Tone> = {
  active: "green",
  paused: "orange",
  draft: "purple",
  closed: "grey",
  private: "info",
};

/** Application status -> tone. */
export const APPLICATION_STATUS_TONE: Record<string, Tone> = {
  applied: "info",
  in_review: "info",
  shortlisted: "green",
  interview: "purple",
  offer: "green",
  rejected: "rose",
  job_closed: "orange",
};

/** The five-step profile strength ladder. */
export const PROFILE_STRENGTH: Record<string, { label: string; tone: Tone }> = {
  getting_started: { label: "Getting started", tone: "grey" },
  making_progress: { label: "Making progress", tone: "yellow" },
  gaining_momentum: { label: "Gaining momentum", tone: "rose" },
  going_strong: { label: "Going strong", tone: "purple" },
  looking_great: { label: "Looking great", tone: "green" },
};

/* --- Badges and chips ------------------------------------------------------ */

export function StatusBadge({
  label,
  tone = "grey",
  className,
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  const t = TONE_CLASS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        t.bg,
        t.text,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", t.dot)} />
      {label}
    </span>
  );
}

/** Outline chip: work setup, salary, experience level, employment type. */
export function Chip({
  children,
  icon,
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs text-ink-muted",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Match reason chip — green on a full match, yellow on a partial one. */
export function MatchChip({ label, level }: { label: string; level: string }) {
  const tone: Tone = level === "match" ? "green" : "yellow";
  const t = TONE_CLASS[tone];
  return (
    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", t.bg, t.text)}>
      {label}
    </span>
  );
}

export function CountBadge({ value }: { value: number }) {
  return (
    <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">
      {value}
    </span>
  );
}

/* --- Buttons --------------------------------------------------------------- */

type ButtonProps = {
  children: ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "outline"
    | "ghost"
    | "danger"
    | "success";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  href?: string;
  disabled?: boolean;
  /** Omit for a plain button; a button with both `href` and `onClick` navigates. */
  onClick?: () => void;
};

/**
 * Three solid tones off the brand scale, as the button frame sets them out:
 * tertiary is the lightest, primary the deep brand blue. Disabled is a real
 * pale fill rather than reduced opacity, so a disabled button on a tinted
 * panel still looks disabled.
 */
const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-brand-700 text-brand-ink hover:bg-brand-800",
  secondary: "bg-brand-500 text-brand-ink hover:bg-brand-600",
  tertiary: "bg-brand-400 text-white hover:bg-brand-500",
  outline: "border border-line bg-card text-ink hover:border-line-strong",
  ghost: "text-brand-700 hover:bg-brand-50",
  danger: "border border-status-rose/40 text-status-rose hover:bg-status-rose-bg",
  success: "border border-status-green/40 text-status-green hover:bg-status-green-bg",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "gap-1.5 px-3 py-1.5 text-xs",
  md: "gap-2 px-4 py-2 text-sm",
  lg: "gap-2 px-5 py-2.5 text-[15px]",
  xl: "gap-2.5 px-6 py-3 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  href,
  disabled,
  onClick,
}: ButtonProps) {
  const solid = variant === "primary" || variant === "secondary" || variant === "tertiary";

  const classes = cn(
    "inline-flex items-center justify-center rounded-md font-medium transition-colors",
    SIZES[size],
    disabled
      ? solid
        ? "pointer-events-none bg-brand-100 text-brand-300"
        : "pointer-events-none border-line text-ink-subtle opacity-60"
      : VARIANTS[variant],
    className,
  );

  if (href && !disabled) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* --- Surfaces -------------------------------------------------------------- */

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-line bg-card", className)}>
      {children}
    </div>
  );
}

/** Large info card: a number, a title and supporting text. */
/** The tinted icon squares the manager overview uses. */
const STAT_TONES: Record<string, string> = {
  green: "bg-status-green-bg text-status-green",
  teal: "bg-brand-100 text-brand-700",
  info: "bg-status-info-bg text-status-info",
  yellow: "bg-status-yellow-bg text-status-yellow",
  purple: "bg-status-purple-bg text-status-purple",
};

export function StatCard({
  value,
  title,
  supporting,
  href,
  icon,
  tone = "teal",
}: {
  value: number | string;
  title: string;
  supporting?: string;
  /** Where the number comes from. A count nobody can act on is decoration. */
  href?: string;
  /** A tinted square on the left, as the manager overview has it. */
  icon?: ReactNode;
  tone?: keyof typeof STAT_TONES | string;
}) {
  const text = (
    <>
      <p className="text-3xl font-semibold tracking-tight text-ink-strong">{value}</p>
      <p className="mt-2 text-sm font-medium text-ink">{title}</p>
      {supporting ? (
        <p className="mt-0.5 text-xs text-ink-subtle">{supporting}</p>
      ) : null}
    </>
  );

  const body = icon ? (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          STAT_TONES[tone] ?? STAT_TONES.teal,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">{text}</div>
    </div>
  ) : (
    text
  );

  if (!href) return <Card className="p-5">{body}</Card>;

  return (
    <Link href={href} className="group block">
      <Card className="h-full p-5 transition-colors group-hover:border-line-strong group-hover:bg-card-muted">
        {body}
      </Card>
    </Link>
  );
}

export function Avatar({
  initials,
  size = "md",
  tone = "teal",
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  tone?: "teal" | "navy";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold",
        size === "sm" && "size-7 text-[11px]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-11 text-sm",
        tone === "teal" ? "bg-brand-100 text-brand-700" : "bg-brand-700 text-brand-ink",
      )}
    >
      {initials}
    </span>
  );
}

/* --- Headings -------------------------------------------------------------- */

export function PageHeading({
  title,
  subtext,
  action,
}: {
  title: string;
  subtext?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-strong">
          {title}
        </h1>
        {subtext ? <p className="mt-1 text-sm text-ink-muted">{subtext}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SectionHeading({
  title,
  subtext,
  action,
}: {
  title: string;
  subtext?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold text-ink-strong">{title}</h2>
        {subtext ? <p className="text-xs text-ink-subtle">{subtext}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* --- Progress -------------------------------------------------------------- */

export function ProgressBar({ value }: { value: number }) {
  const complete = value >= 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          complete ? "bg-status-green" : "bg-brand-700 dark:bg-brand-700",
        )}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <Card className="p-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {body ? <p className="mt-1 text-sm text-ink-subtle">{body}</p> : null}
    </Card>
  );
}
