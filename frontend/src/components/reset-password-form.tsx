"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  AuthError,
  AuthField,
  AuthLayout,
  AuthSubmit,
} from "@/components/auth-layout";
import { api } from "@/lib/api";

/**
 * Both halves of a password reset, on one route.
 *
 * Arriving from the sign-in page there is no link in the URL, so it asks
 * for an address. Arriving from the email there is, so it asks for a new
 * password. One page rather than two because they are one errand, and a
 * person who lands on the wrong one of a pair has no way to tell why.
 */
export function ResetPasswordForm() {
  const params = useSearchParams();
  const uid = params.get("uid");
  const token = params.get("token");

  return uid && token ? (
    <ChooseNewPassword uid={uid} token={token} />
  ) : (
    <AskForLink />
  );
}

function AskForLink() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await api.requestPasswordReset(email.trim());
    setBusy(false);
    if (result.ok) setSent(true);
    else setError(result.error);
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Tell us the address on your account and we'll send you a link."
      footer={
        <p className="text-sm text-ink-muted">
          Remembered it?{" "}
          <Link
            href="/signin"
            className="font-semibold text-ink-strong transition-colors hover:text-brand-700"
          >
            Back to log in
          </Link>
        </p>
      }
    >
      {sent ? (
        /*
          Deliberately says "if", and says the same thing whatever the
          address. Confirming that an account exists would let anyone test
          addresses against the portal and learn who is job hunting.
        */
        <div className="mt-6 rounded-lg border border-line bg-card-muted p-4">
          <p className="text-sm font-medium text-ink-strong">Check your inbox</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            If <span className="font-medium text-ink">{email}</span> has an
            account, a reset link is on its way. It expires in an hour.
          </p>
          <p className="mt-3 text-xs text-ink-subtle">
            Nothing arrived? Check your spam folder, or{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-medium text-brand-700 underline underline-offset-2"
            >
              try another address
            </button>
            .
          </p>
        </div>
      ) : (
        <>
          <AuthError message={error} />
          <form onSubmit={submit} className="mt-6 space-y-4">
            <AuthField
              label="Email"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <AuthSubmit busy={busy} idle="Email me a link" working="Sending…" />
          </form>
        </>
      )}
    </AuthLayout>
  );
}

function ChooseNewPassword({ uid, token }: { uid: string; token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Those two passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);

    const result = await api.confirmPasswordReset(uid, token, password);
    setBusy(false);
    if (result.ok) {
      router.push("/signin?reset=ok");
      return;
    }
    setError(result.error);
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Pick something you have not used here before."
      footer={
        <p className="text-sm text-ink-muted">
          Link expired?{" "}
          <Link
            href="/reset-password"
            className="font-semibold text-ink-strong transition-colors hover:text-brand-700"
          >
            Ask for a new one
          </Link>
        </p>
      }
    >
      <AuthError message={error} />

      <form onSubmit={submit} className="mt-6 space-y-4">
        <AuthField
          label="New password"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <AuthField
          label="Confirm new password"
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <p className="text-xs text-ink-subtle">At least 8 characters.</p>
        <AuthSubmit busy={busy} idle="Save new password" working="Saving…" />
      </form>
    </AuthLayout>
  );
}
