"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

/**
 * Create a job-seeker account.
 *
 * Email and password, as the design has it — the name and the rest of the
 * profile are collected by the profile flow the new account lands on.
 * Hiring-manager accounts are provisioned internally, so there is no role
 * choice here.
 *
 * LinkedIn is offered above that when the backend has credentials for it. It
 * only saves typing an email and a name: LinkedIn's public API returns the
 * name, email and picture and nothing more, so a LinkedIn sign-up still goes
 * on to the same profile flow.
 */
export function SignUpForm({
  linkedin = false,
  notice = null,
}: {
  /** Whether the backend has LinkedIn credentials configured. */
  linkedin?: boolean;
  /** A failure carried back from an external sign-in round trip. */
  notice?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(notice);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await api.register("", email.trim(), password, remember);
    if (result.ok) {
      // Straight on to building the profile (Development Plan, Day 5) rather
      // than an empty dashboard — sign-up collects only email and password,
      // so there is nothing to show until the profile exists.
      router.push("/portal/profile/complete");
      router.refresh();
    } else {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Sign up"
      subtitle="Find your next offshore job"
      footer={
        <>
          <p className="mt-5 text-center text-xs text-ink-muted">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-semibold text-ink-strong transition-colors hover:text-brand-700"
            >
              Log in
            </Link>
          </p>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-subtle">
            By signing up you agree to our Terms of Use and Privacy Policy.
          </p>
        </>
      }
    >
      <AuthError message={error} />

      {linkedin ? (
        <>
          <LinkedInButton
            label="Sign up with LinkedIn"
            next="/portal/profile/complete"
          />
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <RememberMe checked={remember} onChange={setRemember} />

        <AuthSubmit busy={busy} idle="Sign up" working="Signing up…" />
      </form>
    </AuthLayout>
  );
}
