import type { Metadata } from "next";
import { Suspense } from "react";

import { SignUpForm } from "@/components/signup-form";
import { api } from "@/lib/api";
import { AUTH_ERRORS } from "@/lib/auth-errors";

export const metadata: Metadata = {
  title: "Create a profile",
  description:
    "Create your Magnum Opus Consultants profile to apply to roles with one account.",
};

/**
 * Sign-up creates a job-seeker account. Hiring-manager accounts are provisioned
 * internally by other managers, so there is no role choice here.
 *
 * Suspended because both the provider check and ?error= are runtime data: an
 * external sign-in that fails sends the browser back here with a reason.
 */
export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  return (
    <Suspense fallback={<SignUpForm />}>
      <SignUpPanel searchParams={searchParams} />
    </Suspense>
  );
}

async function SignUpPanel({
  searchParams,
}: {
  searchParams: PageProps<"/signup">["searchParams"];
}) {
  const [params, providers] = await Promise.all([
    searchParams,
    api.authProviders(),
  ]);

  const code = typeof params.error === "string" ? params.error : null;

  return (
    <SignUpForm
      linkedin={providers.ok && providers.data.linkedin}
      notice={
        code
          ? (AUTH_ERRORS[code] ?? "Could not sign up. Please try again.")
          : null
      }
    />
  );
}
