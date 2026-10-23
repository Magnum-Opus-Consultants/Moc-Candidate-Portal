import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { EmailEditorPage } from "@/components/email-editor";
import { BackendOffline, PageSkeleton } from "@/components/states";
import { PageHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export const metadata = { title: "Edit automatic email" };

/**
 * One automatic email, on its own page inside the manager shell.
 *
 * There is no endpoint for a single email — the list already returns all
 * of them with their triggers — so this picks the one it needs out of
 * that payload rather than adding a route to the API for the sake of it.
 */
export default function EditAutomaticEmailPage({
  params,
}: PageProps<"/manager/emails/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/manager/emails/[id]">["params"];
}) {
  // "updated 2 days ago" is only true at the moment it renders.
  await connection();
  const { id } = await params;
  const result = await api.managerEmails();
  if (!result.ok) return <BackendOffline error={result.error} />;

  const email = result.data.results.find((row) => String(row.id) === id);
  if (!email) notFound();

  return (
    <div className="space-y-6">
      <PageHeading
        title={email.label}
        subtext="Change the wording. Every email sent afterwards uses it; the ones already sent keep what they said."
      />
      <EmailEditorPage email={email} triggers={result.data.triggers} />
    </div>
  );
}
