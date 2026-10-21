"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";

/**
 * The job filters.
 *
 * A client component on purpose. As plain <details> links every tick was a
 * full navigation — a second of dead time per choice — and nothing closed
 * the other menus, so they stacked on top of each other. Here only one menu
 * is open at a time, ticking several options keeps it open, and the
 * navigation runs in a transition so the list dims rather than freezing.
 */

export type FilterGroup = {
  key: string;
  label: string;
  options: ReadonlyArray<readonly [string, string]>;
};

export function FilterRail({
  groups,
  selected,
  facets,
  hrefs,
  clearHref,
}: {
  groups: ReadonlyArray<FilterGroup>;
  /** Chosen values per group key. */
  selected: Record<string, string[]>;
  /** Per-option result counts, so each choice shows its effect. */
  facets: Record<string, Record<string, number>>;
  /**
   * Where toggling each value leads, as group key -> value -> href.
   *
   * Plain data rather than a callback: a function cannot cross the server to
   * client boundary, and the option sets are small enough to precompute.
   */
  hrefs: Record<string, Record<string, string>>;
  clearHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const rail = useRef<HTMLDivElement>(null);

  // One menu at a time, and clicking away or pressing Escape closes it.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rail.current?.contains(event.target as Node)) setOpen(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle(key: string, value: string) {
    const href = hrefs[key]?.[value];
    if (!href) return;
    // The menu stays open so several options can be ticked in one go.
    startTransition(() => router.replace(href, { scroll: false }));
  }

  const anySelected = groups.some((g) => (selected[g.key] ?? []).length > 0);

  return (
    <div
      ref={rail}
      className={cn(
        "flex flex-wrap items-center gap-2 transition-opacity",
        pending && "opacity-60",
      )}
    >
      {groups.map((group) => {
        const chosen = selected[group.key] ?? [];
        const counts = facets[group.key] ?? {};
        const isOpen = open === group.key;

        return (
          <div key={group.key} className="relative">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-haspopup="true"
              onClick={() => setOpen(isOpen ? null : group.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                // The browser's own focus ring is a hard black outline that
                // looked like a rendering fault on a rounded pill.
                "outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
                chosen.length
                  ? "border-brand-700 bg-brand-700 font-medium text-brand-ink"
                  : isOpen
                    // Open but nothing picked yet: tinted, so it is clear
                    // which menu is on screen without claiming a selection.
                    ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                    : "border-line-strong bg-card text-ink hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
              )}
            >
              {group.label}
              {chosen.length ? (
                <span className="rounded-full bg-white/25 px-1.5 text-[11px] font-semibold leading-4">
                  {chosen.length}
                </span>
              ) : null}
              <Icon
                name="chevron-down"
                className={cn("size-3 transition-transform", isOpen && "rotate-180")}
              />
            </button>

            {isOpen ? (
              <div className="absolute left-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
                <p className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
                  {group.label}
                </p>
                <div className="max-h-72 overflow-y-auto p-1.5">
                {group.options.map(([value, label]) => {
                  const on = chosen.includes(value);
                  const count = counts[value] ?? 0;
                  // Nothing behind it and not already on: picking it would
                  // only empty the list.
                  const dead = count === 0 && !on;

                  return (
                    <button
                      key={value}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      disabled={dead}
                      onClick={() => toggle(group.key, value)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        dead
                          ? "cursor-not-allowed text-ink-subtle opacity-50"
                          : on
                            ? "bg-brand-50 font-medium text-brand-700"
                            : "text-ink hover:bg-card-muted",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-4 shrink-0 place-items-center rounded border",
                          on
                            ? "border-brand-700 bg-brand-700 text-brand-ink"
                            : "border-line-strong",
                        )}
                      >
                        {on ? <Icon name="check" className="size-3" /> : null}
                      </span>
                      <span className="flex-1">{label}</span>
                      <span className="text-xs tabular-nums text-ink-subtle">
                        {count.toLocaleString("en-ZA")}
                      </span>
                    </button>
                  );
                })}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {anySelected ? (
        <button
          type="button"
          onClick={() => {
            setOpen(null);
            startTransition(() => router.replace(clearHref, { scroll: false }));
          }}
          className="ml-1 text-xs font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
