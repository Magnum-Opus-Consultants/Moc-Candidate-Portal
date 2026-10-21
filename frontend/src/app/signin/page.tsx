import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInForm } from "@/components/signin-form";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Log in to the Magnum Opus Consultants careers portal — job seekers and hiring managers.",
};

/**
 * The shared sign-in page for both roles, per SOW MOC-CP:0001.
 *
 * Wrapped in Suspense because the form reads ?next= to send a visitor back to
 * the page that sent them here, and search params are runtime data.
 */
export default function SignInPage() {
  return (
    /* The fallback cannot be the form itself: it reads ?next= and ?error=
       with useSearchParams, which is exactly the runtime data the fallback
       stands in for while prerendering. */
    <Suspense fallback={<AuthSkeleton />}>
      <SignInPanel />
    </Suspense>
  );
}

/** The provider check is a runtime fetch, so it lives inside the boundary. */
async function SignInPanel() {
  const providers = await api.authProviders();
  return <SignInForm linkedin={providers.ok && providers.data.linkedin} />;
}

/** A quiet stand-in while the provider check and query string resolve. */
function AuthSkeleton() {
  return <div className="min-h-dvh bg-card" />;
}
