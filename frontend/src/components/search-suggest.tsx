"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import { API_BASE_URL } from "@/lib/api";

/**
 * The job search box, with suggestions as you type.
 *
 * A combobox rather than a plain input: it suggests real job titles,
 * disciplines and companies drawn from the live postings, so a search lands
 * on something that exists instead of guessing at wording.
 *
 * Requests are debounced and the in-flight one is aborted when the next
 * keystroke arrives, so a fast typist does not queue a request per letter
 * or see an older reply overwrite a newer one.
 */

type Suggestion = { value: string; kind: string; hint: string };

const KIND_ICON: Record<string, IconName> = {
  title: "search",
  category: "grid",
  company: "building",
};

export function SearchSuggest({
  name = "q",
  defaultValue = "",
  placeholder = "Job title or keyword",
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const listId = useId();
  const [term, setTerm] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = term.trim();
    // Nothing to ask for yet. Stale items stay in state but are not shown:
    // `tooShort` gates the list, which avoids a setState in this effect.
    if (query.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/jobs/suggest/?q=${encodeURIComponent(query)}`,
          { signal: controller.signal, credentials: "include" },
        );
        if (!response.ok) return;
        const data = await response.json();
        setItems(data.results ?? []);
        setActive(-1);
      } catch {
        // Aborted by the next keystroke, or offline — the box still works
        // as a plain input either way.
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(value: string) {
    setTerm(value);
    setOpen(false);
    // Let React write the value before the form reads it.
    requestAnimationFrame(() => input.current?.form?.requestSubmit());
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(items[active].value);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const tooShort = term.trim().length < 2;
  const showing = open && !tooShort && items.length > 0;

  return (
    <div ref={box} className="relative flex-1">
      <div className="flex items-center gap-2.5 rounded-xl border border-line-strong bg-card py-2 pl-4 pr-2 shadow-sm transition-shadow focus-within:border-brand-500 focus-within:shadow-md">
        <Icon name="search" className="size-[18px] shrink-0 text-ink-subtle" />
        <label htmlFor={`${listId}-input`} className="sr-only">
          {placeholder}
        </label>
        <input
          id={`${listId}-input`}
          ref={input}
          type="search"
          name={name}
          value={term}
          autoComplete="off"
          role="combobox"
          aria-expanded={showing}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 ? `${listId}-opt-${active}` : undefined
          }
          placeholder={placeholder}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-ink placeholder:text-ink-subtle focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-800"
        >
          Search jobs
        </button>
      </div>

      {showing ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-line bg-card py-1.5 shadow-lg"
        >
          {items.map((item, index) => (
            <li key={`${item.kind}:${item.value}`}>
              <button
                type="button"
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(item.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                  index === active ? "bg-card-muted" : "hover:bg-card-muted",
                )}
              >
                <Icon
                  name={KIND_ICON[item.kind] ?? "search"}
                  className="size-3.5 shrink-0 text-ink-subtle"
                />
                <span className="flex-1 truncate text-ink">{item.value}</span>
                <span className="shrink-0 text-xs text-ink-subtle">
                  {item.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
