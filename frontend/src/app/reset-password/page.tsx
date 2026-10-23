import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description:
    "Reset the password on your Magnum Opus Consultants careers account.",
  // A reset link should not be indexed, and neither should the page that
  // consumes one.
  robots: { index: false, follow: false },
};

/**
 * Both halves of a reset live in one client component, which reads the
 * link's uid and token from the query — so the page is a Suspense
 * boundary, as useSearchParams requires.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
