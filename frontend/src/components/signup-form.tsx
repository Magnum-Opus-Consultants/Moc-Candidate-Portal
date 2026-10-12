"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Logo, LogoMark } from "@/components/logo";
import { api } from "@/lib/api";

/**
 * Create a job-seeker account (name, email, password). On success the server
 * signs the new account in and says where it lands (/portal). Social providers
 * are later scope, shown but not wired.
 */
export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await api.register(name.trim(), email.trim(), password);
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
            Create your profile
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            One account to apply to every MOC role.
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
              label="Name"
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
              <label
                htmlFor="password"
                className="text-sm font-medium text-ink-strong"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="mt-1.5 w-full rounded-md border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
              <p className="mt-1.5 text-xs text-ink-subtle">
                Must be at least 8 characters.
              </p>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-300"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-subtle">or continue with</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            title="Available soon"
            className="flex w-full items-center justify-center gap-3 rounded-md border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-card-muted"
          >
            <GoogleIcon />
            Sign up with Google
          </button>

          <p className="mt-8 text-center text-sm text-ink-muted">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-medium text-brand-700 transition-colors hover:text-brand-800"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>

      {/* Brand panel. */}
      <aside className="relative hidden w-[44%] max-w-[560px] overflow-hidden bg-gradient-brand lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[18%] top-[6%] h-[55%] w-[70%] rounded-[50%] bg-white/5"
        />
        <div className="relative flex flex-1 flex-col p-12">
          <LogoMark href="/" className="h-12" />
          <div className="mt-auto">
            <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight text-brand-ink">
              World-class South African talent, global impact.
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                "One profile to apply to every MOC role",
                "Track your applications end to end",
                "A branded CV, ready to download",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-center gap-3 text-sm text-brand-ink-muted"
                >
                  <Check />
                  {line}
                </li>
              ))}
            </ul>
          </div>
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

function Check() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-5 shrink-0 text-brand-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
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
