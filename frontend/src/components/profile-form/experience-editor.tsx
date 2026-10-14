"use client";

/**
 * The Experience section: a list of roles, each editable in place.
 *
 * Key responsibilities are their own ordered list, since the designs show
 * them as individually editable rows — and because the AI rewriting advice
 * (Development Plan, Day 7) works per responsibility rather than on one blob
 * of text.
 */

import { useState } from "react";

import {
  AddButton,
  Checkbox,
  Field,
  Label,
  Pair,
  Select,
  type Option,
} from "@/components/profile-form/fields";
import { Icon } from "@/components/ui/icon";

export type ExperienceEntry = {
  job_title: string;
  company_name: string;
  employment_type: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  reason_for_leaving: string;
  key_responsibilities: string[];
};

function blank(): ExperienceEntry {
  return {
    job_title: "",
    company_name: "",
    employment_type: "",
    start_date: "",
    end_date: "",
    is_current: false,
    reason_for_leaving: "",
    key_responsibilities: [],
  };
}

export function ExperienceEditor({
  entries,
  employmentTypes,
  onChange,
}: {
  entries: ExperienceEntry[];
  employmentTypes: Option[];
  onChange: (next: ExperienceEntry[]) => void;
}) {
  const [adding, setAdding] = useState(entries.length === 0);

  function update(index: number, patch: Partial<ExperienceEntry>) {
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  return (
    <div className="space-y-5">
      {entries.map((entry, index) => (
        <EntryCard
          key={index}
          entry={entry}
          employmentTypes={employmentTypes}
          onChange={(patch) => update(index, patch)}
          onRemove={() => onChange(entries.filter((_, i) => i !== index))}
        />
      ))}

      {adding || entries.length === 0 ? (
        <NewEntry
          employmentTypes={employmentTypes}
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
          Add another role
        </button>
      )}
    </div>
  );
}

function EntryCard({
  entry,
  employmentTypes,
  onChange,
  onRemove,
}: {
  entry: ExperienceEntry;
  employmentTypes: Option[];
  onChange: (patch: Partial<ExperienceEntry>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-line p-5">
      <Fields
        entry={entry}
        employmentTypes={employmentTypes}
        onChange={onChange}
      />

      <Responsibilities
        items={entry.key_responsibilities}
        onChange={(key_responsibilities) => onChange({ key_responsibilities })}
      />

      <div className="mt-4 flex justify-end border-t border-line pt-3">
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-status-rose transition-colors hover:bg-status-rose-bg"
        >
          <Icon name="close" className="size-3.5" />
          Remove this role
        </button>
      </div>
    </div>
  );
}

function NewEntry({
  employmentTypes,
  onAdd,
  onCancel,
}: {
  employmentTypes: Option[];
  onAdd: (entry: ExperienceEntry) => void;
  onCancel?: () => void;
}) {
  const [entry, setEntry] = useState<ExperienceEntry>(blank());

  return (
    <div className="rounded-xl border border-line p-5">
      <Fields
        entry={entry}
        employmentTypes={employmentTypes}
        onChange={(patch) => setEntry((e) => ({ ...e, ...patch }))}
      />

      <Responsibilities
        items={entry.key_responsibilities}
        onChange={(key_responsibilities) =>
          setEntry((e) => ({ ...e, key_responsibilities }))
        }
      />

      <div className="mt-4 flex justify-end gap-2 border-t border-line pt-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-card-muted"
          >
            Discard
          </button>
        ) : null}
        <AddButton
          disabled={!entry.job_title.trim()}
          onClick={() => {
            onAdd(entry);
            setEntry(blank());
          }}
        >
          Add this role
        </AddButton>
      </div>
    </div>
  );
}

function Fields({
  entry,
  employmentTypes,
  onChange,
}: {
  entry: ExperienceEntry;
  employmentTypes: Option[];
  onChange: (patch: Partial<ExperienceEntry>) => void;
}) {
  return (
    <div className="space-y-5">
      <Pair>
        <Field
          label="Job title"
          value={entry.job_title}
          onChange={(job_title) => onChange({ job_title })}
          placeholder="Job title"
        />
        <Field
          label="Company name"
          value={entry.company_name}
          onChange={(company_name) => onChange({ company_name })}
          placeholder="Company name"
        />
      </Pair>

      <Select
        label="Employment type"
        value={entry.employment_type}
        onChange={(employment_type) => onChange({ employment_type })}
        options={employmentTypes}
      />

      <div>
        <Label>Dates of employment</Label>
        <div className="mt-1.5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field
            label="Start date"
            type="date"
            value={entry.start_date ?? ""}
            onChange={(start_date) => onChange({ start_date })}
          />
          <Field
            label="End date"
            type="date"
            value={entry.is_current ? "" : (entry.end_date ?? "")}
            onChange={(end_date) => onChange({ end_date })}
          />
          <div className="pb-2.5">
            <Checkbox
              checked={entry.is_current}
              onChange={(is_current) =>
                onChange({ is_current, end_date: is_current ? "" : entry.end_date })
              }
              label="This is my current role"
            />
          </div>
        </div>
      </div>

      <Field
        label="Reason for leaving"
        value={entry.reason_for_leaving}
        onChange={(reason_for_leaving) => onChange({ reason_for_leaving })}
        placeholder="Reason for leaving"
      />
    </div>
  );
}

function Responsibilities({
  items,
  onChange,
}: {
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  function add() {
    const value = text.trim();
    if (!value) return;
    onChange([...items, value]);
    setText("");
  }

  return (
    <div className="mt-5">
      <Label>Key responsibilities</Label>

      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-2 rounded-lg border border-line px-3 py-2"
            >
              {editing === index ? (
                <>
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-ink focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    aria-label="Save responsibility"
                    onClick={() => {
                      const next = [...items];
                      next[index] = editText.trim() || item;
                      onChange(next);
                      setEditing(null);
                    }}
                    className="rounded p-1 text-status-green hover:bg-status-green-bg"
                  >
                    <Icon name="check" className="size-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <Icon
                    name="list"
                    className="mt-0.5 size-3.5 shrink-0 text-ink-subtle"
                  />
                  <span className="flex-1 text-sm leading-relaxed text-ink">
                    {item}
                  </span>
                  <button
                    type="button"
                    aria-label={`Edit "${item}"`}
                    onClick={() => {
                      setEditing(index);
                      setEditText(item);
                    }}
                    className="rounded p-1 text-ink-subtle transition-colors hover:bg-card-muted hover:text-ink"
                  >
                    <Icon name="edit" className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete "${item}"`}
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                    className="rounded p-1 text-ink-subtle transition-colors hover:bg-status-rose-bg hover:text-status-rose"
                  >
                    <Icon name="close" className="size-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2 flex items-start gap-2">
        <textarea
          value={text}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Enter your key responsibilities"
          aria-label="New key responsibility"
          className="flex-1 resize-y rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none"
        />
        <AddButton disabled={!text.trim()} onClick={add} />
      </div>
    </div>
  );
}
