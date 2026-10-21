"use client";

import { Logo } from "@/components/logo";
import { API_BASE_URL } from "@/lib/api";

/**
 * The shared frame for sign up and sign in.
 *
 * One component rather than a copy per page, so the two cannot drift: the
 * quiet panel on the left, the logo above the form, and the copyright pinned
 * to the bottom are defined once here.
 */

/*
 * Read once when the module loads rather than per render: calling new Date()
 * during a render is unstable and blocks prerendering.
 */
const COPYRIGHT_YEAR = new Date().getFullYear();

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Links under the form — "Already have an account?" and the terms line. */
  footer?: React.ReactNode;
}) {
  return (
    /*
     * A grid, not flex: with flex the panel carried w-full beside a flex-1
     * sibling, so the two together asked for more than the viewport and the
     * form overflowed off the right edge. Grid columns are definite, so the
     * halves always add up.
     */
    <div className="grid min-h-dvh grid-cols-1 bg-card lg:grid-cols-[3fr_2fr]">
      <aside aria-hidden className="hidden bg-canvas lg:block" />

      <main className="flex min-w-0 flex-col">
        <div className="flex justify-center pt-10">
          <Logo href="/" className="h-11" />
        </div>

        <div className="flex flex-1 items-center justify-center px-8 py-8">
          <div className="w-full max-w-[520px]">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink-strong">
              {title}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>

            {children}

            {footer}
          </div>
        </div>

        <footer className="pb-6 text-center text-xs text-ink-subtle">
          © Magnum Opus Consultants {COPYRIGHT_YEAR}
        </footer>
      </main>
    </div>
  );
}

/** The error banner both forms show above their fields. */
export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mt-5 rounded-md border border-status-rose/30 bg-status-rose-bg px-3 py-2 text-sm text-status-rose"
    >
      {message}
    </div>
  );
}

/** A labelled rule between the provider buttons and the email form. */
export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="text-xs uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/**
 * Sign in with LinkedIn.
 *
 * A plain link rather than a fetch: OAuth is a full-page round trip out to
 * LinkedIn and back to Django, which sets the session cookie before sending
 * the browser here again. It points straight at the API origin, since the
 * redirect has to come back to the same server that holds the state.
 */
export function LinkedInButton({
  label,
  next,
}: {
  label: string;
  /** Where to land afterwards, for a brand new account. */
  next?: string;
}) {
  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <a
      href={`${API_BASE_URL}/api/auth/linkedin/start/${query}`}
      className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-lg border border-line-strong bg-card px-4 py-2.5 text-sm font-semibold text-ink-strong transition-colors hover:border-ink-subtle hover:bg-card-muted"
    >
      <LinkedInMark />
      {label}
    </a>
  );
}

function LinkedInMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-[18px] shrink-0"
      fill="#0A66C2"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}


export function AuthField({
  label,
  id,
  ...props
}: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-ink-strong">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="mt-1.5 w-full rounded-md border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}

export function RememberMe({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 accent-brand-700"
      />
      Remember me
    </label>
  );
}

export function AuthSubmit({
  busy,
  idle,
  working,
}: {
  busy: boolean;
  idle: string;
  working: string;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-md bg-brand-700 px-4 py-2.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-100 disabled:text-brand-300"
    >
      {busy ? working : idle}
    </button>
  );
}
