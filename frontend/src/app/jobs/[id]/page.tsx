import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BackendOffline, CardSkeleton } from "@/components/states";
import { JobDetailView } from "@/components/job-detail-view";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export default function JobDetailPage({ params }: PageProps<"/jobs/[id]">) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <Icon name="chevron-right" className="size-3.5 rotate-180" />
            All jobs
          </Link>
          <Button href="/signin" variant="outline" size="sm">
            Sign in
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <Suspense fallback={<CardSkeleton className="h-96" />}>
          <JobDetail params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function JobDetail({ params }: { params: PageProps<"/jobs/[id]">["params"] }) {
  const { id } = await params;
  const result = await api.job(id);

  if (!result.ok) {
    if (result.error.startsWith("404")) notFound();
    return <BackendOffline error={result.error} />;
  }

  return <JobDetailView job={result.data} />;
}
