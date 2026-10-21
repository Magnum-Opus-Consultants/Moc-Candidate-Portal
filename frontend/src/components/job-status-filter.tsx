"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";

/**
 * "All job statuses" — the status picker on the manager's job list.
 *
 * A menu rather than a row of pills, as the designs have it: six statuses
 * side by side crowded the search row, and a manager picks one at a time.
 * Each option carries its count so the choice is informed before it is made.
 */

export type StatusOption = {
  value: string;
  label: string;
  count: number;
  /**
   * Where choosing this status leads, precomputed.
   *
   * Plain data rather than a callback: a function cannot cross the server
   * to client boundary, and there are only six statuses.
   */
  href: string;
};

export function JobStatusFilter({
  options,
  selected,
}: {
  options: StatusOption[];
  selected: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = options.find((option) => option.value === selected);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-ink transition-colors",
          "outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
          open ? "border-brand-500" : "border-line hover:border-line-strong",
          pending && "opacity-60",
        )}
      >
        {current?.label ?? "All job statuses"}
        <Icon
          name="chevron-down"
          className={cn(
            "size-3.5 text-ink-subtle transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Job status"
          className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-card shadow-lg"
        >
          {options.map((option) => {
            const on = option.value === selected;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  setOpen(false);
                  startTransition(() =>
                    router.push(option.href, { scroll: false }),
                  );
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                  on
                    ? "bg-brand-50 font-medium text-brand-700"
                    : "text-ink hover:bg-card-muted",
                )}
              >
                <span className="flex-1">{option.label}</span>
                <span className="text-xs tabular-nums text-ink-subtle">
                  {option.count.toLocaleString("en-ZA")}
                </span>
                {on ? (
                  <Icon name="check" className="size-4 text-brand-700" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
