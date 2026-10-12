import { Suspense } from "react";

import { BackendOffline, PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Card,
  EmptyState,
  PageHeading,
} from "@/components/ui/primitives";
import { api, relativeDays } from "@/lib/api";

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
  const result = await api.managerEmails();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const emails = result.data.results;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Automatic emails"
        subtext="Sent from careers@moc-pty.com when their event happens."
      />

      {emails.length === 0 ? (
        <EmptyState
          title="No automatic emails set up"
          body="The Client supplies these before the status notifications are built."
        />
      ) : (
        <div className="space-y-4">
          {emails.map((email) => (
            <Card key={email.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <div>
                  <p className="font-medium text-ink-strong">{email.label}</p>
                  <p className="font-mono text-xs text-ink-subtle">{email.event}</p>
                </div>
                <span className="text-xs text-ink-subtle">
                  Updated {relativeDays(email.updated_at).toLowerCase()}
                </span>
              </div>

              <div className="space-y-4 p-5">
                <label className="block">
                  <span className="text-xs font-medium text-ink-muted">Subject</span>
                  <input
                    defaultValue={email.subject}
                    className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-brand-700 focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-ink-muted">Wording</span>
                  <textarea
                    defaultValue={email.body}
                    rows={7}
                    className="mt-1.5 w-full resize-y rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs leading-relaxed text-ink focus:border-brand-700 focus:outline-none"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-ink-subtle">
                    Placeholders such as{" "}
                    <code className="font-mono">{"{candidate_name}"}</code> and{" "}
                    <code className="font-mono">{"{job_title}"}</code> are filled
                    in when the email is sent.
                  </p>
                  <Button size="sm">
                    <Icon name="check" className="size-3.5" />
                    Save wording
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
