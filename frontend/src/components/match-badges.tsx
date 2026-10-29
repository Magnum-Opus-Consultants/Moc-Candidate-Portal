"use client";

import { useState } from "react";

import { cn } from "@/components/ui/primitives";
import type { MatchReason } from "@/lib/api";

/**
 * The match reasons on a recommended job card (11:4934).
 *
 * The frame shows three reasons and a "+2 more" chip. That chip is a control,
 * not a label: it opens the rest in place and then reads "Show less", so the
 * reasons it is counting are actually reachable.
 */

/** Green when met, amber when partial, grey when not. */
const TONES: Record<MatchReason["level"], string> = {
  match: "bg-match-met-bg text-match-met",
  partial: "bg-match-partial-bg text-match-partial",
  none: "bg-match-none-bg text-match-none",
};

const BADGE = "rounded-2xl px-2 py-0.5 text-xs font-medium leading-[18px]";

export function MatchBadges({
  reasons,
  limit = 3,
  on = "page",
}: {
  reasons: MatchReason[];
  limit?: number;
  /** Neutral/100 reads as a chip on the page white; on a panel tile it would
      disappear into the tile, so there it takes the white instead. */
  on?: "panel" | "page";
}) {
  const [open, setOpen] = useState(false);

  if (reasons.length === 0) return null;

  const shown = open ? reasons : reasons.slice(0, limit);
  const extra = reasons.length - shown.length;

  return (
    <div className="flex w-full flex-wrap content-center items-center gap-3">
      {shown.map((reason, index) => (
        <span
          key={`${reason.label}-${index}`}
          className={cn(BADGE, TONES[reason.level] ?? TONES.match)}
        >
          {reason.label}
        </span>
      ))}

      {reasons.length > limit ? (
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          className={cn(
            BADGE,
            "text-ink-muted transition-colors hover:text-ink-strong",
            on === "page" ? "bg-canvas hover:bg-line" : "bg-card hover:bg-line",
          )}
        >
          {open ? "Show less" : `+${extra} more`}
        </button>
      ) : null}
    </div>
  );
}
