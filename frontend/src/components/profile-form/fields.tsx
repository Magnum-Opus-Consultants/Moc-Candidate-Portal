"use client";

/**
 * Form controls for the profile creation flow.
 *
 * Inputs stay native, so the browser handles validation, keyboard and
 * autofill, and a required field reads as required to a screen reader rather
 * than only showing a red asterisk.
 *
 * Dropdowns do not. A native <select> draws its list with the operating
 * system's own styling - a square white box with a blue highlight that
 * ignores the brand entirely and cannot be reached from CSS. `Select` is
 * therefore a listbox built here: same props, same keyboard behaviour, and a
 * search box once the list is long enough that scrolling it is a chore.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";

export type Option = { value: string; label: string };

export function Label({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium leading-5 text-ink-muted">
      {children}
      {required ? (
        <span className="text-status-rose" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

const CONTROL =
  "mt-1.5 w-full rounded-lg border border-line-strong bg-card px-3.5 py-2.5 " +
  "text-base leading-6 text-ink shadow-xs " +
  "placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 " +
  "focus:ring-brand-100 disabled:bg-card-muted";

export function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
  id,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  id?: string;
}) {
  // Derived from the label, this collides whenever two controls share a
  // label - three "Proficiency" selects on the profile form all answered
  // to the same id, so two of the three labels focused the wrong one.
  const fieldId = id ?? useId();
  return (
    <div>
      <Label htmlFor={fieldId} required={required}>
        {label}
      </Label>
      <input
        id={fieldId}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder ?? "Placeholder"}
        onChange={(e) => onChange(e.target.value)}
        className={CONTROL}
      />
    </div>
  );
}

/** Past this many options, typing finds one faster than scrolling. */
const SEARCH_FROM = 12;

export function Select({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  id,
  hideLabel,
  className,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  id?: string;
  /**
   * Drop the visible label, for a dropdown that sits inside a labelled row
   * (the currency beside a salary). The label still names the control to a
   * screen reader.
   */
  hideLabel?: boolean;
  /** Width and spacing for those inline cases. */
  className?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const listId = `${generated}-list`;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState("");

  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const searchable = options.length >= SEARCH_FROM;

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, query]);

  const selected = options.find((o) => o.value === value) ?? null;

  // Opening and closing set their own state in the handler rather than in an
  // effect reacting to `open`: an effect that calls setState runs a second
  // render for no reason, and React now warns about it.
  function openMenu() {
    // Start on the current choice, so Enter without moving leaves the value
    // alone instead of silently changing it.
    setActive(options.findIndex((o) => o.value === value));
    setQuery("");
    setOpen(true);
  }

  function closeMenu({ refocus = true } = {}) {
    setOpen(false);
    setQuery("");
    if (refocus) button.current?.focus();
  }

  // Focus the search box once the menu is on screen. No state is set here,
  // so this stays an effect.
  useEffect(() => {
    if (open && searchable) search.current?.focus();
  }, [open, searchable]);

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    if (!open || active < 0) return;
    list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      // Clicking away must not drag focus back to the button, or the page
      // jumps to a field the reader has just left.
      if (!box.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function choose(option: Option) {
    onChange(option.value);
    closeMenu();
  }

  function clear() {
    onChange("");
    closeMenu();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      closeMenu();
      return;
    }

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % Math.max(shown.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? shown.length - 1 : i - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(shown.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (shown[active]) choose(shown[active]);
    } else if (event.key === "Tab") {
      closeMenu({ refocus: false });
    }
  }

  return (
    <div ref={box} className={cn("relative", className)}>
      {hideLabel ? null : (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      )}

      <button
        ref={button}
        id={fieldId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={hideLabel ? label : undefined}
        onClick={() => (open ? closeMenu({ refocus: false }) : openMenu())}
        onKeyDown={onKeyDown}
        className={cn(
          CONTROL,
          "flex items-center justify-between gap-2 text-left",
          hideLabel && "mt-0",
          open && "border-brand-500 ring-2 ring-brand-100",
          !selected && "text-ink-subtle",
        )}
      >
        <span className="truncate">
          {selected ? selected.label : (placeholder ?? label)}
        </span>
        <Icon
          name="chevron-down"
          className={cn(
            "size-4 shrink-0 text-ink-subtle transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
          {searchable ? (
            <div className="border-b border-line p-2">
              <input
                ref={search}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={`Search ${label.toLowerCase()}`}
                aria-label={`Search ${label.toLowerCase()}`}
                className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none"
              />
            </div>
          ) : null}

          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-64 overflow-y-auto p-1.5"
          >
            {/* Clearing the field is a real choice when it is optional. */}
            {!required && !query ? (
              <li>
                <Choice
                  label={placeholder ?? label}
                  muted
                  selected={!value}
                  active={active === -1}
                  onPick={clear}
                />
              </li>
            ) : null}

            {shown.map((option, index) => (
              <li key={option.value}>
                <Choice
                  label={option.label}
                  selected={option.value === value}
                  active={index === active}
                  onHover={() => setActive(index)}
                  onPick={() => choose(option)}
                />
              </li>
            ))}

            {shown.length === 0 ? (
              <li className="px-2.5 py-3 text-center text-sm text-ink-subtle">
                Nothing matches that search
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Choice({
  label,
  selected,
  active,
  muted,
  onHover,
  onPick,
}: {
  label: string;
  selected: boolean;
  active: boolean;
  muted?: boolean;
  onHover?: () => void;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseEnter={onHover}
      onClick={onPick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        active ? "bg-brand-50" : "hover:bg-card-muted",
        selected
          ? "font-medium text-brand-700"
          : muted
            ? "text-ink-subtle"
            : "text-ink",
      )}
    >
      <span className="flex-1 truncate">{label}</span>
      {selected ? (
        <Icon name="check" className="size-4 shrink-0 text-brand-700" />
      ) : null}
    </button>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  id,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div>
      {label ? <Label htmlFor={fieldId}>{label}</Label> : null}
      <textarea
        id={fieldId}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(CONTROL, "resize-y")}
      />
    </div>
  );
}

export function RadioGroup({
  legend,
  required,
  value,
  onChange,
  options,
  inline = true,
}: {
  legend: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  inline?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium leading-5 text-ink-muted">
        {legend}
        {required ? (
          <span className="text-status-rose" aria-hidden>
            *
          </span>
        ) : null}
      </legend>
      <div className={cn("mt-2 gap-x-6 gap-y-1.5", inline ? "flex flex-wrap" : "grid")}>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-2 text-sm text-ink"
          >
            <input
              type="radio"
              name={legend}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="size-4 accent-brand-700"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The tick inside a checked box.
 *
 * `accent-color` on a native checkbox only recolours the browser's own square
 * mark - it cannot give it the 4px radius or the brand outline the design
 * system draws. `appearance-none` plus this mark does, and the control stays
 * a real <input type="checkbox">, so keyboard and screen readers are
 * unchanged.
 */
const TICK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M13 4.5 6.5 11 3 7.5' " +
  "stroke='%23064b70' stroke-width='2' stroke-linecap='round' " +
  "stroke-linejoin='round'/%3E%3C/svg%3E\")";

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 appearance-none rounded border border-brand-700 bg-card bg-center bg-no-repeat transition-colors checked:bg-brand-secondary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        style={checked ? { backgroundImage: TICK } : undefined}
      />
      {label}
    </label>
  );
}

/** A removable token, as the designs show for languages, skills and tools. */
export function Token({
  prefix,
  label,
  onRemove,
}: {
  prefix?: string;
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-muted py-1 pl-1 pr-1.5 text-xs text-ink">
      {prefix ? (
        <span className="rounded bg-card px-1.5 py-0.5 text-[11px] text-ink-muted">
          {prefix}
        </span>
      ) : null}
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="rounded p-0.5 text-ink-subtle transition-colors hover:bg-card hover:text-status-rose"
      >
        <Icon name="close" className="size-3" />
      </button>
    </span>
  );
}

/** The form's section container — a white card with a heading. */
export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-line bg-card p-6"
    >
      <h2 className="border-b border-line pb-4 text-lg font-semibold text-ink-strong">
        {title}
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

/** Two fields side by side on wide screens, stacked on narrow. */
export function Pair({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

export function AddButton({
  onClick,
  disabled,
  children = "Add",
}: {
  onClick: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-800 disabled:bg-brand-100 disabled:text-brand-300"
    >
      {children}
    </button>
  );
}
