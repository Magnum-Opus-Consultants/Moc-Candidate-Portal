"use client";

import { useState } from "react";

import {
  Checkbox,
  Field,
  Pair,
  Select,
  type Option,
} from "@/components/profile-form/fields";
import { Icon } from "@/components/ui/icon";

/**
 * Qualifications, one card each.
 *
 * It used to be four flat fields, which could only ever hold the last
 * qualification typed — a candidate with a diploma and a degree had to drop
 * one. Same shape as the experience editor so the two sections behave alike.
 */

export type EducationEntry = {
  level: string;
  field_of_study: string;
  institution_name: string;
  graduation_year: number | string | null;
  is_current: boolean;
};

function blank(): EducationEntry {
  return {
    level: "",
    field_of_study: "",
    institution_name: "",
    graduation_year: "",
    is_current: false,
  };
}

/**
 * Graduation years, newest first.
 *
 * A dropdown rather than a text box: typed in, the field accepted "21",
 * which is neither a year nor a useful thing to match against. The future
 * years are for a qualification still in progress.
 */
const THIS_YEAR = new Date().getFullYear();
const YEARS: Option[] = Array.from({ length: 66 }, (_, i) => {
  const year = THIS_YEAR + 5 - i;
  return { value: String(year), label: String(year) };
});

export function EducationEditor({
  entries,
  levels,
  onChange,
}: {
  entries: EducationEntry[];
  levels: Option[];
  onChange: (next: EducationEntry[]) => void;
}) {
  const [adding, setAdding] = useState(entries.length === 0);

  function update(index: number, patch: Partial<EducationEntry>) {
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  return (
    <div className="space-y-5">
      {entries.map((entry, index) => (
        <div key={index} className="rounded-xl border border-line p-5">
          <EntryFields
            entry={entry}
            levels={levels}
            onChange={(patch) => update(index, patch)}
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => onChange(entries.filter((_, i) => i !== index))}
              className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-status-rose"
            >
              <Icon name="close" className="size-4" />
              Remove
            </button>
          </div>
        </div>
      ))}

      {adding || entries.length === 0 ? (
        <NewEntry
          levels={levels}
          onAdd={(entry) => {
            onChange([...entries, entry]);
            setAdding(false);
          }}
          onCancel={entries.length > 0 ? () => setAdding(false) : undefined}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-3 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
        >
          <Icon name="plus" className="size-4" />
          Add another qualification
        </button>
      )}
    </div>
  );
}

function EntryFields({
  entry,
  levels,
  onChange,
}: {
  entry: EducationEntry;
  levels: Option[];
  onChange: (patch: Partial<EducationEntry>) => void;
}) {
  return (
    <div className="space-y-5">
      <Pair>
        <Select
          label="Qualification level"
          required
          value={entry.level}
          onChange={(level) => onChange({ level })}
          options={levels}
          placeholder="Qualification level"
        />
        <Field
          label="Field of study"
          required
          value={entry.field_of_study}
          onChange={(field_of_study) => onChange({ field_of_study })}
          placeholder="e.g. Information Systems"
        />
      </Pair>

      <Pair>
        <Select
          label={entry.is_current ? "Expected graduation year" : "Graduation year"}
          value={entry.graduation_year ? String(entry.graduation_year) : ""}
          onChange={(graduation_year) => onChange({ graduation_year })}
          options={YEARS}
          placeholder="Year"
        />
        <Field
          label="Institution name"
          required
          value={entry.institution_name}
          onChange={(institution_name) => onChange({ institution_name })}
          placeholder="e.g. University of Cape Town"
        />
      </Pair>

      {/* Coerced: a row that arrived from a CV parse or an older profile
          may have no is_current at all, and React warns when a controlled
          input starts undefined and then becomes defined. */}
      <Checkbox
        label="I am still studying this"
        checked={Boolean(entry.is_current)}
        onChange={(is_current) => onChange({ is_current })}
      />
    </div>
  );
}

function NewEntry({
  levels,
  onAdd,
  onCancel,
}: {
  levels: Option[];
  onAdd: (entry: EducationEntry) => void;
  onCancel?: () => void;
}) {
  const [entry, setEntry] = useState<EducationEntry>(blank());

  // Everything the card marks with a red asterisk. The section used to read
  // 100%% complete off a level alone, so the asterisks were decoration.
  const ready = Boolean(
    entry.level && entry.field_of_study.trim() && entry.institution_name.trim(),
  );

  return (
    <div className="rounded-xl border border-dashed border-line-strong p-5">
      <EntryFields
        entry={entry}
        levels={levels}
        onChange={(patch) => setEntry((e) => ({ ...e, ...patch }))}
      />

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line-strong bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-card-muted"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            onAdd(entry);
            setEntry(blank());
          }}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-800 disabled:bg-brand-100 disabled:text-brand-300"
        >
          Add this qualification
        </button>
      </div>
    </div>
  );
}
