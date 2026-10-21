/**
 * The recruitment-stage tracker.
 *
 * The SOW has both roles monitoring "the stage each candidate has reached in
 * the recruitment process", so an application shows its position on the
 * pipeline rather than a single status badge. The stage order and the history
 * both come from the API — nothing about the sequence is decided here.
 */

import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import { formatDate, type Application } from "@/lib/api";

export function StageTracker({ application }: { application: Application }) {
  const { pipeline, stage_index, is_closed, status_label } = application;

  return (
    <div>
      <ol className="flex items-start">
        {pipeline.map((stage, index) => {
          const reached = index <= stage_index;
          const current = index === stage_index && !is_closed;
          const last = index === pipeline.length - 1;

          return (
            <li
              key={stage.value}
              className={cn("relative flex-1", !last && "pr-1")}
            >
              <div className="flex items-center">
                <span
                  className={cn(
                    "z-10 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                    reached
                      ? is_closed
                        ? "border-ink-subtle bg-ink-subtle text-white"
                        : "border-brand-700 bg-brand-700 text-brand-ink"
                      : "border-line bg-card",
                    current && "ring-4 ring-brand-100",
                  )}
                >
                  {reached ? <Icon name="check" className="size-3" /> : null}
                </span>

                {!last ? (
                  <span
                    className={cn(
                      "h-0.5 flex-1",
                      index < stage_index
                        ? is_closed
                          ? "bg-ink-subtle"
                          : "bg-brand-700"
                        : "bg-line",
                    )}
                  />
                ) : null}
              </div>

              <span
                className={cn(
                  "mt-2 block pr-2 text-[11px] leading-tight",
                  current
                    ? "font-semibold text-brand-700"
                    : reached
                      ? "text-ink"
                      : "text-ink-subtle",
                )}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>

      {is_closed ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
          <Icon name="close" className="size-3.5 shrink-0" />
          This application ended at <strong className="font-medium">{status_label}</strong>.
        </p>
      ) : null}
    </div>
  );
}

/** The status-change history, collapsed by default. */
export function StageHistory({ application }: { application: Application }) {
  const { events } = application;
  if (events.length === 0) return null;

  return (
    <details className="group mt-4 border-t border-line pt-3">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-brand-700 [&::-webkit-details-marker]:hidden">
        <Icon
          name="chevron-down"
          className="size-3.5 transition-transform group-open:rotate-0 -rotate-90"
        />
        {events.length} {events.length === 1 ? "update" : "updates"}
      </summary>

      <ol className="mt-3 space-y-2.5 pl-1">
        {events.map((event) => (
          <li key={event.id} className="flex gap-3 text-xs">
            <span
              aria-hidden
              className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-300"
            />
            <div className="min-w-0">
              <p className="text-ink">
                {event.from_label ? (
                  <>
                    Moved from{" "}
                    <span className="text-ink-muted">{event.from_label}</span> to{" "}
                    <strong className="font-medium">{event.to_label}</strong>
                  </>
                ) : (
                  <strong className="font-medium">{event.to_label}</strong>
                )}
              </p>
              {event.note ? (
                <p className="mt-0.5 text-ink-muted">{event.note}</p>
              ) : null}
              <p className="mt-0.5 text-ink-subtle">
                {formatDate(event.created_at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** What went to the position with the application (Development Plan, Day 5). */
export function SentWithApplication({ application }: { application: Application }) {
  const { sent } = application;

  const items: Array<{ label: string; ok: boolean }> = [
    { label: `Profile (${sent.profile_completion}% complete)`, ok: sent.profile },
    { label: sent.cv ? "CV (PDF)" : "No CV uploaded", ok: sent.cv },
    {
      label:
        sent.documents > 0
          ? `${sent.documents} supporting ${sent.documents === 1 ? "document" : "documents"}`
          : "No supporting documents",
      ok: sent.documents > 0,
    },
  ];

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className="text-xs text-ink-subtle">Sent with this application:</span>
      {items.map((item) => (
        <span
          key={item.label}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs",
            item.ok ? "text-ink" : "text-ink-subtle",
          )}
        >
          <Icon
            name={item.ok ? "check" : "close"}
            className={cn(
              "size-3",
              item.ok ? "text-status-green" : "text-ink-subtle",
            )}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
