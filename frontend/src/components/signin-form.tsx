"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  AuthDivider,
  AuthError,
  AuthField,
  AuthLayout,
  AuthSubmit,
  LinkedInButton,
  RememberMe,
} from "@/components/auth-layout";
import { api } from "@/lib/api";
import { AUTH_ERRORS } from "@/lib/auth-errors";

/**
 * Shared sign-in for both roles — one page, email and password.
 *
 * The role (job seeker or hiring manager) belongs to the account rather than
 * being chosen here: managers are provisioned by other managers. After
 * signing in the server says where that role lands, /portal or /manager,
 * unless the visitor was sent here from a page they wanted.
 */
export function SignInForm({ linkedin = false }: { linkedin?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  // An external sign-in that failed sends the browser back with a code.
  const failed = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(
    failed ? (AUTH_ERRORS[failed] ?? "Could not sign in. Please try again.") : null,
  );
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await api.login(email.trim(), password, remember);
    if (result.ok) {
      // Only follow an in-app path, so ?next= cannot send anyone off-site.
      const target =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : result.data.home;
      router.push(target);
      router.refresh();
    } else {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back to the MOC careers portal"
      footer={
        <p className="mt-5 text-center text-xs text-ink-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-ink-strong transition-colors hover:text-brand-700"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <AuthError message={error} />

      {linkedin ? (
        <>
          <LinkedInButton label="Log in with LinkedIn" next={next ?? undefined} />
          <AuthDivider />
        </>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <AuthField
          label="Email"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
        <AuthField
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <RememberMe checked={remember} onChange={setRemember} />

        <AuthSubmit busy={busy} idle="Log in" working="Logging in…" />
      </form>
    </AuthLayout>
  );
}
