"use client";

/**
 * Form controls for the profile creation flow.
 *
 * Deliberately plain: every control is a labelled native input or select, so
 * the browser handles validation, keyboard and autofill, and a required field
 * reads as required to a screen reader rather than only showing a red
 * asterisk.
 */

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
    <label htmlFor={htmlFor} className="block text-xs font-medium text-ink-muted">
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
  "mt-1.5 w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-ink " +
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
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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

export function Select({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  id,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  id?: string;
}) {
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <Label htmlFor={fieldId} required={required}>
        {label}
      </Label>
      <select
        id={fieldId}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={cn(CONTROL, !value && "text-ink-subtle")}
      >
        <option value="">{placeholder ?? label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
    </div>
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
  const fieldId = id ?? (label ?? "notes").toLowerCase().replace(/[^a-z0-9]+/g, "-");
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
      <legend className="text-xs font-medium text-ink-muted">
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
        className="mt-0.5 size-4 accent-brand-700"
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
      <h2 className="text-lg font-semibold text-ink-strong">{title}</h2>
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
      className="shrink-0 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:bg-brand-100 disabled:text-brand-300"
    >
      {children}
    </button>
  );
}
