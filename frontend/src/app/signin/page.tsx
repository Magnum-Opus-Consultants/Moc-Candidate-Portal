import type { Metadata } from "next";

import { SignInForm } from "@/components/signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to the Magnum Opus Consultants careers portal — job seekers and hiring managers.",
};

/**
 * The shared sign-in page for both roles, per SOW MOC-CP:0001: email/password,
 * Google, LinkedIn and SSO through one page. The form itself is a client
 * component (role toggle + submit); real authentication is later scope, so the
 * providers navigate to the relevant dashboard for now.
 */
export default function SignInPage() {
  return <SignInForm />;
}
