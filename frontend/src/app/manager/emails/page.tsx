import { Suspense } from "react";
import { connection } from "next/server";

import { EmailManager } from "@/components/email-manager";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { PageHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/**
 * One of the three pages designed during the project: hiring managers pick an
 * automatic email, change its subject and wording, and save. Every email sent
 * afterwards uses the new wording.
 */
export default function AutomaticEmailsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AutomaticEmails />
    </Suspense>
  );
}

async function AutomaticEmails() {
  // Relative dates ('3 days ago') are true only at the moment they are
  // rendered, so this subtree is request-time rather than prerendered.
  await connection();
  const result = await api.managerEmails();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const { results, triggers, log } = result.data;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Automatic emails"
        subtext="Sent from careers@moc-pty.com when their event happens."
      />

      <EmailManager emails={results} triggers={triggers} log={log} />
    </div>
  );
}
