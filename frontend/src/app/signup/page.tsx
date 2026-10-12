import type { Metadata } from "next";

import { SignUpForm } from "@/components/signup-form";

export const metadata: Metadata = {
  title: "Create a profile",
  description:
    "Create your Magnum Opus Consultants profile to apply to roles with one account.",
};

/**
 * Sign-up creates a job-seeker account. Hiring-manager accounts are provisioned
 * internally by other managers, so there is no role choice here.
 */
export default function SignUpPage() {
  return <SignUpForm />;
}
