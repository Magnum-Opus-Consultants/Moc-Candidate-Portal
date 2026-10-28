"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  Checkbox,
  Field,
  Label,
  Select,
  TextArea,
} from "@/components/profile-form/fields";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import { api, type Job } from "@/lib/api";

/**
 * Quick edit — the key details a hiring manager changes most, without
 * opening the full posting form.
 *
 * Three presentations from the design file, all on the same fields and the
 * same save, chosen with `variant`:
 *
 *   drawer   — Option 1, a right-hand sheet. The only one with room for
 *              About the company and Key responsibilities as well.
 *   inline   — Option 2, a wide panel above the posting, three columns.
 *   floating — Option 3, a popover anchored beside the Key details card.
 *
 * They are one component rather than three because the fields, the
 * validation and the save are identical; only the frame differs. Building
 * them separately is how two of them end up out of step with the third.
 *
 * Everything here is unlocked after publishing. The locked fields — title,
 * company, role category, work setup, requirements — are deliberately
 * absent: changing those on a live posting would invalidate the matches
 * candidates already applied against.
 */

export type QuickEditVariant = "drawer" | "inline" | "floating";

/** Hours as the design writes them: 08:00, 17:00. */
const HOURS = Array.from({ length: 25 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, "0")}:00`,
}));

const CURRENCIES = [
  { value: "ZAR", label: "ZAR" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
];

/** YYYY-MM-DD for a date input, from whatever the API sent. */
function asDate(value: string | null | undefined): string {
  return value ? String(value).slice(0, 10) : "";
}

function money(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return String(Number(value));
}

export function QuickEdit({
  job,
  variant = "drawer",
  open,
  onClose,
}: {
  job: Job;
  variant?: QuickEditVariant;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  const [idealStart, setIdealStart] = useState(asDate(job.ideal_start_date));
  const [closes, setCloses] = useState(asDate(job.closes_at));
  const [from, setFrom] = useState(String(job.working_hours_start ?? ""));
  const [to, setTo] = useState(String(job.working_hours_end ?? ""));
  const [flexible, setFlexible] = useState(Boolean(job.flexible_hours));
  const [currency, setCurrency] = useState(job.salary_currency || "ZAR");
  const [salaryMin, setSalaryMin] = useState(money(job.salary_min));
  const [salaryMax, setSalaryMax] = useState(money(job.salary_max));
  const [marketRelated, setMarketRelated] = useState(
    (job.salary_label || "").toLowerCase() === "market-related",
  );
  const [benefits, setBenefits] = useState((job.benefits ?? []).join(", "));
  const [about, setAbout] = useState(job.about_company ?? "");
  const [responsibilities, setResponsibilities] = useState(
    (job.key_responsibilities ?? []).join("\n"),
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Escape closes, and for the two overlay variants a click outside does
  // too. The inline panel sits in the page flow, so an outside click is
  // just somebody reading the posting and must not discard their edits.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    function onClick(event: MouseEvent) {
      if (variant === "inline" || busy) return;
      if (panel.current && !panel.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, busy, variant, onClose]);

  if (!open) return null;

  async function save() {
    setBusy(true);
    setError(null);

    const result = await api.updateJob(job.id, {
      ideal_start_date: idealStart || null,
      closes_at: closes || null,
      working_hours_start: from,
      working_hours_end: to,
      flexible_hours: flexible,
      salary_currency: currency,
      salary_min: salaryMin,
      salary_max: salaryMax,
      // The toggle is what candidates see; the range stays stored either way.
      salary_label: marketRelated ? "Market-related" : "",
      benefits: benefits
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean),
      ...(variant === "drawer"
        ? {
            about_company: about,
            key_responsibilities: responsibilities
              .split("\n")
              .map((r) => r.replace(/^[•\-\s]+/, "").trim())
              .filter(Boolean),
          }
        : {}),
    });

    setBusy(false);
    if (result.ok) {
      onClose();
      router.refresh();
      return;
    }
    setError(result.error);
  }

  const wide = variant === "inline";

  const fields = (
    <div className={cn("space-y-5", wide && "sm:space-y-4")}>
      <div className={cn("grid gap-4", wide ? "md:grid-cols-3" : "sm:grid-cols-2")}>
        <Field
          label="Ideal start date"
          type="date"
          value={idealStart}
          onChange={setIdealStart}
        />
        <Field
          label="Applications close"
          required
          type="date"
          value={closes}
          onChange={setCloses}
        />

        {wide ? <Salary /> : null}
      </div>

      <div className={cn("grid gap-4", wide ? "md:grid-cols-3" : "")}>
        <div>
          <Label required>Working hours ({job.timezone_label || "SAST"})</Label>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Select label="" value={from} onChange={setFrom} options={HOURS} />
            </div>
            <span className="text-sm text-ink-faint">to</span>
            <div className="min-w-0 flex-1">
              <Select label="" value={to} onChange={setTo} options={HOURS} />
            </div>
          </div>
          <div className="mt-2">
            <Checkbox
              label="Flexible working hours"
              checked={flexible}
              onChange={setFlexible}
            />
          </div>
        </div>

        {wide ? (
          <div className="md:col-span-2">
            <Field
              label="Benefits"
              value={benefits}
              onChange={setBenefits}
              placeholder="Medical aid, pension fund, hybrid working"
            />
          </div>
        ) : null}
      </div>

      {wide ? null : (
        <>
          <Salary />
          <Field
            label="Benefits"
            value={benefits}
            onChange={setBenefits}
            placeholder="Medical aid, pension fund, hybrid working"
          />
        </>
      )}

      {variant === "drawer" ? (
        <>
          <TextArea
            label="About the company"
            rows={5}
            value={about}
            onChange={setAbout}
          />
          <TextArea
            label="Key responsibilities"
            rows={5}
            value={responsibilities}
            onChange={setResponsibilities}
            placeholder={"One per line"}
          />
        </>
      ) : null}
    </div>
  );

  /** The salary range and its "Market-related" toggle. */
  function Salary() {
    return (
      <div>
        <Label required>Gross salary per {job.salary_period || "year"}</Label>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <div className="w-24 shrink-0">
              <Select
                label=""
                value={currency}
                onChange={setCurrency}
                options={CURRENCIES}
              />
            </div>
            <Field label="" value={salaryMin} onChange={setSalaryMin} />
          </div>
          <span className="text-sm text-ink-faint">to</span>
          <div className="min-w-0 flex-1">
            <Field label="" value={salaryMax} onChange={setSalaryMax} />
          </div>
        </div>
        <label className="mt-2 flex cursor-pointer items-start gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={marketRelated}
            onClick={() => setMarketRelated((v) => !v)}
            className={cn(
              "mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
              marketRelated ? "bg-brand-700" : "bg-line-strong",
            )}
          >
            <span
              className={cn(
                "block size-4 rounded-full bg-card transition-transform",
                marketRelated ? "translate-x-[18px]" : "translate-x-0.5",
              )}
            />
          </button>
          <span className="text-sm">
            <span className="font-medium text-ink-muted">
              Show as “Market-related” to candidates
            </span>
            <span className="block text-ink-subtle">
              Candidates won’t see the exact amount.
            </span>
          </span>
        </label>
      </div>
    );
  }

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-strong">
          Quick edit · Key details
        </h2>
        <p className="truncate text-xs text-ink-muted">
          {[job.title, job.company].filter(Boolean).join(" · ")}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close quick edit"
        className="rounded p-1 text-ink-subtle transition-colors hover:text-ink"
      >
        <Icon name="close" className="size-4" />
      </button>
    </div>
  );

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <a
        href={`/manager/jobs/${job.id}/edit`}
        className="text-sm font-medium text-ink-muted transition-colors hover:text-ink-strong"
      >
        Edit full job post
      </a>
      <div className="flex items-center gap-2">
        {error ? (
          <span role="alert" className="text-xs text-status-rose">
            {error}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-line-strong bg-card px-3.5 py-2 text-sm font-semibold text-ink shadow-xs transition-colors hover:bg-card-muted disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg border border-brand-secondary bg-brand-secondary px-3.5 py-2 text-sm font-semibold text-brand-secondary-ink shadow-xs transition-colors hover:border-brand-secondary-hover hover:bg-brand-secondary-hover disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );

  const note = (
    <p className="text-xs leading-[18px] text-ink-faint">
      Applicants who applied will be notified if the closing date or working
      hours change.
    </p>
  );

  if (variant === "inline") {
    return (
      <section
        ref={panel}
        aria-label="Quick edit"
        className="rounded-2xl border border-brand-300 bg-card p-5 shadow-sm"
      >
        {header}
        <div className="mt-4">{fields}</div>
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          {note}
          {footer}
        </div>
      </section>
    );
  }

  if (variant === "floating") {
    return (
      <>
        {/* No dim: the panel is anchored to the card it edits and the page
            behind it is the context for what you are changing. */}
        <div
          ref={panel}
          role="dialog"
          aria-label="Quick edit"
          className="absolute right-0 top-0 z-30 w-[457px] max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-card p-5 shadow-lg"
        >
          {header}
          <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">{fields}</div>
          <div className="mt-4 space-y-3 border-t border-line pt-4">
            {note}
            {footer}
          </div>
        </div>
      </>
    );
  }

  // Drawer
  return (
    <div className="fixed inset-0 z-40">
      <div aria-hidden className="absolute inset-0 bg-black/40" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Quick edit"
        className="absolute inset-y-0 right-0 flex w-full max-w-[30rem] flex-col bg-card shadow-2xl"
      >
        <div className="border-b border-line p-5">{header}</div>
        <div className="flex-1 overflow-y-auto p-5">{fields}</div>
        <div className="space-y-3 border-t border-line p-5">
          {note}
          {footer}
        </div>
      </div>
    </div>
  );
}
