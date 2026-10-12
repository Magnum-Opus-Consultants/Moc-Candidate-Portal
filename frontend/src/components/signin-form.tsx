"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Logo, LogoMark } from "@/components/logo";
import { api } from "@/lib/api";

/**
 * Shared sign-in for both roles — one page, email + password. The account's
 * role (job seeker or hiring manager) is set on the account, not chosen here:
 * managers are provisioned by other managers, so there is no role switch. After
 * sign-in the server says where the role lands (/portal or /manager).
 *
 * Google, LinkedIn, Apple and SSO are later scope (they need provider
 * credentials), so they show but are not wired yet.
 */
export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await api.login(email.trim(), password);
    if (result.ok) {
      router.push(result.data.home);
      router.refresh();
    } else {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Form panel. */}
      <main className="flex flex-1 flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo href="/" className="h-8 lg:hidden" />
          <span className="hidden lg:block" />
          <Link
            href="/"
            className="text-sm text-ink-muted transition-colors hover:text-ink-strong"
          >
            ← Back to jobs
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-strong">
            Sign in
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Welcome back to the MOC careers portal.
          </p>

          {error ? (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-status-rose/30 bg-status-rose-bg px-3.5 py-2.5 text-sm text-status-rose"
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field
              label="Email"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div>
              <div className="flex items-baseline justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-ink-strong"
                >
                  Password
                </label>
                <Link
                  href="/signin"
                  className="text-xs text-brand-700 transition-colors hover:text-brand-800"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-300"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-subtle">or continue with</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="space-y-2.5">
            <ProviderButton label="Continue with Google">
              <GoogleIcon />
            </ProviderButton>
            <ProviderButton label="Continue with LinkedIn">
              <LinkedInIcon />
            </ProviderButton>
            <ProviderButton label="Single sign-on (SSO)">
              <SsoIcon />
            </ProviderButton>
          </div>

          <p className="mt-8 text-center text-sm text-ink-muted">
            New to MOC?{" "}
            <Link
              href="/signup"
              className="font-medium text-brand-700 transition-colors hover:text-brand-800"
            >
              Create a profile
            </Link>
          </p>
        </div>
      </main>

      {/* Brand panel — the deep MOC blue with a word from a placed candidate. */}
      <aside className="relative hidden w-[44%] max-w-[560px] overflow-hidden bg-gradient-brand lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[18%] top-[6%] h-[55%] w-[70%] rounded-[50%] bg-white/5"
        />
        <div className="relative flex flex-1 flex-col p-12">
          <LogoMark href="/" className="h-12" />
          <figure className="mt-auto">
            <blockquote className="text-2xl font-medium leading-snug tracking-tight text-brand-ink">
              “One profile, and MOC matched me to a role with an international
              team — on a local contract. The portal kept every step in one
              place.”
            </blockquote>
            <figcaption className="mt-6">
              <p className="font-semibold text-brand-ink">Thabo Mokoena</p>
              <p className="text-sm text-brand-ink-muted">
                Placed via Magnum Opus Consultants
              </p>
            </figcaption>
          </figure>
        </div>
      </aside>
    </div>
  );
}

/* --- Pieces ---------------------------------------------------------------- */

function Field({
  label,
  id,
  ...props
}: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink-strong">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="mt-1.5 w-full rounded-md border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
      />
    </div>
  );
}

function ProviderButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title="Available soon"
      className="flex w-full items-center justify-center gap-3 rounded-md border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-card-muted"
    >
      {children}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="#0A66C2">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.73v20.53C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.73C24 .78 23.2 0 22.22 0Z" />
    </svg>
  );
}

function SsoIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-[18px] text-ink-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
