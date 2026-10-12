/** Loading and error states shared across the portal. */

import { API_BASE_URL } from "@/lib/api";
import { Card, cn } from "@/components/ui/primitives";

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-xl bg-card", className ?? "h-28")}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton className="h-10 w-64" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <CardSkeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <CardSkeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

/**
 * Shown when the Django API cannot be reached. Rendering this beats a 500:
 * in development the backend is often simply not running yet.
 */
export function BackendOffline({ error }: { error: string }) {
  return (
    <Card className="mt-8 p-6">
      <span className="inline-flex items-center gap-2 rounded-full bg-status-orange-bg px-3 py-1 text-xs font-medium text-status-orange">
        <span aria-hidden className="size-1.5 rounded-full bg-status-orange" />
        Backend unreachable
      </span>

      <h2 className="mt-4 text-lg font-semibold text-ink-strong">
        The portal cannot reach its API
      </h2>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-muted">
        The front end is running, but nothing answered at{" "}
        <code className="font-mono text-ink">{API_BASE_URL}</code>. Start the
        Django server and reload.
      </p>

      <pre className="mt-4 overflow-x-auto rounded-lg bg-card-muted p-4 font-mono text-xs text-ink-muted">
        cd backend{"\n"}.venv\Scripts\python.exe manage.py runserver
      </pre>
      <p className="mt-3 font-mono text-xs text-ink-subtle">{error}</p>
    </Card>
  );
}
