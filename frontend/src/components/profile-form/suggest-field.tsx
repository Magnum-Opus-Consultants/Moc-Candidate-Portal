"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Label } from "@/components/profile-form/fields";
import { cn } from "@/components/ui/primitives";
import { API_BASE_URL } from "@/lib/api";

/**
 * A text field that suggests values as you type.
 *
 * Free text, not a dropdown: a candidate's job title is whatever their
 * employer called it, and a fixed list would force them to pick something
 * that is not what they did. The suggestions come from the titles actually
 * posted on the board, so a seeker who takes one is phrased the same way as
 * the jobs they want to match against.
 *
 * Requests are debounced and the in-flight one is aborted on each keystroke,
 * so a fast typist never sees an older reply land on top of a newer one.
 */

const DEBOUNCE_MS = 180;
const MIN_CHARS = 2;

export function SuggestField({
  label,
  value,
  onChange,
  placeholder,
  kind = "title",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Which kind of suggestion from /api/jobs/suggest/ to keep. */
  kind?: "title" | "company";
  required?: boolean;
}) {
  const fieldId = useId();
  const listId = `${fieldId}-list`;

  const [items, setItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < MIN_CHARS) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/jobs/suggest/?q=${encodeURIComponent(query)}`,
          { signal: controller.signal, credentials: "include" },
        );
        if (!response.ok) return;
        const data = await response.json();
        setItems(
          (data.results ?? [])
            .filter((row: { kind: string }) => row.kind === kind)
            .map((row: { value: string }) => row.value)
            .slice(0, 8),
        );
        setActive(-1);
      } catch {
        // Aborted by the next keystroke, or offline. Either way the field
        // still works as a plain text box.
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, kind]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // An exact match is not a suggestion, it is what they already typed.
  const shown = items.filter(
    (item) => item.toLowerCase() !== value.trim().toLowerCase(),
  );
  const showing = open && value.trim().length >= MIN_CHARS && shown.length > 0;

  function choose(item: string) {
    onChange(item);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!showing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % shown.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? shown.length - 1 : i - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(shown[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={box} className="relative">
      <Label htmlFor={fieldId} required={required}>
        {label}
      </Label>
      <input
        id={fieldId}
        type="text"
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={showing}
        aria-controls={showing ? listId : undefined}
        aria-autocomplete="list"
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="mt-1.5 w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />

      {showing ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-line bg-card p-1.5 shadow-lg"
        >
          {shown.map((item, index) => (
            <li key={item}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(item)}
                className={cn(
                  "w-full truncate rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors",
                  index === active ? "bg-brand-50" : "hover:bg-card-muted",
                )}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
