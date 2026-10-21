"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  AddButton,
  Checkbox,
  Field,
  Label,
  Pair,
  RadioGroup,
  Section,
  Select,
  TextArea,
  Token,
  type Option,
} from "@/components/profile-form/fields";
import { Icon } from "@/components/ui/icon";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { StatusBadge, cn } from "@/components/ui/primitives";
import { api, type Job, type ProfileOptions } from "@/lib/api";

/**
 * "Add new job post" — the hiring manager's posting form.
 *
 * Nine sections and a completion panel, as the designs have it. The panel
 * is not decoration: the form is long, and a manager part-way through needs
 * to see what is still missing before publishing rather than after.
 *
 * Saving keeps it a draft. Publishing puts it on the public board straight
 * away, which is why it is the deliberate second button rather than the one
 * Enter happens to press.
 */

/**
 * Wraps a field the server can reject: a red ring and the reason underneath,
 * plus a `data-field` hook so `submit` can scroll to the first one.
 *
 * Defined at module scope on purpose. Declared inside JobCreateForm it would
 * be a new component type on every render, so React would remount the field
 * and the input would lose focus after each keystroke.
 */
function Flagged({
  field,
  message,
  children,
}: {
  field: string;
  message: string | null;
  children: React.ReactNode;
}) {
  return (
    <div
      data-field={field}
      className={cn(
        "scroll-mt-28 rounded-lg",
        message && "-m-2 bg-status-rose-bg/40 p-2 ring-1 ring-status-rose",
      )}
    >
      {children}
      {message ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-status-rose">
          {message}
        </p>
      ) : null}
    </div>
  );
}

type Skill = { name: string; proficiency: string; importance: string };
type Tool = { name: string; proficiency: string };
type LanguageNeed = { language: string; proficiency: string };

const SECTIONS = [
  { id: "overview", label: "Job overview" },
  { id: "employer", label: "Employer details" },
  { id: "work_setup", label: "Work setup" },
  { id: "candidate", label: "Candidate requirements" },
  { id: "experience", label: "Experience requirements" },
  { id: "education", label: "Education requirements" },
  { id: "remuneration", label: "Remuneration & benefits" },
  { id: "responsibilities", label: "Job responsibilities" },
  { id: "skills", label: "Skills & tools" },
] as const;

const HOURS: Option[] = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, "0")}:00`,
}));

const SKILL_IMPORTANCE: Option[] = [
  { value: "required", label: "Required" },
  { value: "preferred", label: "Preferred" },
];

export function JobCreateForm({
  options,
  job,
}: {
  options: ProfileOptions;
  /** Omit to create; pass a posting to edit it in place. */
  job?: Job;
}) {
  const router = useRouter();
  const editing = Boolean(job);

  /** A stored value as the form wants it: a string, never null. */
  const text = (value: unknown) =>
    value === null || value === undefined ? "" : String(value);

  const [form, setForm] = useState(() => ({
    // Job overview
    title: "",
    role_category: "",
    ideal_start_date: "",
    closes_at: "",
    about_company: "",
    description: "",
    // Employer details
    company: "",
    company_industry: "",
    company_location: "",
    location: "",
    hr_email: "",
    hr_phone: "",
    // Work setup
    employment_type: "",
    work_setup: "",
    timezone_label: "",
    candidate_location: "",
    night_shift: "",
    working_hours_start: "",
    working_hours_end: "",
    // Candidate requirements
    citizenship_requirement: "",
    // Experience
    experience_level: "",
    minimum_years_experience: "",
    industry_experience: "",
    // Education
    education_requirement: "",
    field_of_study: "",
    // Remuneration
    salary_currency: "ZAR",
    salary_min: "",
    salary_max: "",
    salary_period: "",
    salary_label: "Market-related",
    // An edit starts from what is stored; a create from the blanks above.
    ...(job
      ? {
          title: text(job.title),
          role_category: text(job.role_category),
          ideal_start_date: text(job.ideal_start_date).slice(0, 10),
          closes_at: text(job.closes_at).slice(0, 10),
          about_company: text(job.about_company),
          description: text(job.description),
          company: text(job.company),
          company_industry: text(job.company_industry),
          company_location: text(job.company_location),
          location: text(job.location),
          hr_email: text(job.hr_email),
          hr_phone: text(job.hr_phone),
          employment_type: text(job.employment_type),
          work_setup: text(job.work_setup),
          timezone_label: text(job.timezone_label),
          candidate_location: text(job.candidate_location),
          night_shift: text(job.night_shift),
          working_hours_start: text(job.working_hours_start),
          working_hours_end: text(job.working_hours_end),
          citizenship_requirement: text(job.citizenship_requirement),
          experience_level: text(job.experience_level),
          minimum_years_experience: text(job.minimum_years_experience),
          industry_experience: text(job.industry_experience),
          education_requirement: text(job.education_requirement),
          field_of_study: text(job.field_of_study),
          salary_currency: text(job.salary_currency) || "ZAR",
          salary_min: text(job.salary_min),
          salary_max: text(job.salary_max),
          salary_period: text(job.salary_period),
          salary_label: text(job.salary_label) || "Market-related",
        }
      : {}),
  }));

  const [flexibleHours, setFlexibleHours] = useState(job?.flexible_hours ?? false);
  const [languages, setLanguages] = useState<LanguageNeed[]>(
    () => (job?.language_requirements as LanguageNeed[]) ?? [],
  );
  const [benefits, setBenefits] = useState<string[]>(() => job?.benefits ?? []);
  const [responsibilities, setResponsibilities] = useState<string[]>(
    () => job?.key_responsibilities ?? [],
  );
  const [skills, setSkills] = useState<Skill[]>(() =>
    (job?.required_skills ?? []).map((entry) =>
      typeof entry === "string"
        ? { name: entry, proficiency: "", importance: "required" }
        : {
            name: entry.name,
            proficiency: entry.proficiency ?? "",
            importance: entry.level ?? "required",
          },
    ),
  );
  const [tools, setTools] = useState<Tool[]>(
    () => (job?.software_tools as Tool[]) ?? [],
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /**
   * How far through each section the manager is.
   *
   * Scored the way the candidate profile is: the share of that section's
   * own fields that are filled, so the ring rises honestly.
   */
  const progress = useMemo(() => {
    const filled = (...values: unknown[]) =>
      Math.round(
        (100 * values.filter((v) => (Array.isArray(v) ? v.length : v)).length) /
          values.length,
      );

    return {
      overview: filled(
        form.title,
        form.role_category,
        form.closes_at,
        form.about_company,
        form.description,
      ),
      employer: filled(
        form.company,
        form.company_industry,
        form.company_location,
        form.hr_email,
      ),
      work_setup: filled(
        form.employment_type,
        form.work_setup,
        form.timezone_label,
        form.night_shift,
        form.working_hours_start,
      ),
      candidate: filled(form.citizenship_requirement, languages),
      experience: filled(
        form.experience_level,
        form.minimum_years_experience,
        form.industry_experience,
      ),
      education: filled(form.education_requirement, form.field_of_study),
      remuneration: filled(form.salary_min, form.salary_max, form.salary_period),
      responsibilities: responsibilities.length ? 100 : 0,
      skills: filled(skills, tools),
    } as Record<string, number>;
  }, [form, languages, responsibilities, skills, tools]);

  const completion = Math.round(
    SECTIONS.reduce((sum, s) => sum + (progress[s.id] ?? 0), 0) / SECTIONS.length,
  );

  async function submit(status: "draft" | "active") {
    setBusy(true);
    setError(null);
    setMissing([]);
    setFieldErrors({});

    const payload = {
      ...form,
      status,
      flexible_hours: flexibleHours,
      language_requirements: languages,
      benefits,
      key_responsibilities: responsibilities,
      required_skills: skills.map((skill) => ({
        name: skill.name,
        level: skill.importance,
        proficiency: skill.proficiency,
      })),
      software_tools: tools,
    };

    // Editing keeps the posting's own status — publish and close are their
    // own actions, so saving an edit never takes a live job off the board.
    const result = job
      ? await api.updateJob(job.id, payload)
      : await api.createJob(payload);

    if (result.ok) {
      router.push(`/manager/jobs/${result.data.id}`);
      router.refresh();
      return;
    }

    setBusy(false);
    setError(result.error);
    setMissing(result.fields ?? []);
    setFieldErrors(result.fieldErrors ?? {});

    // A long form scrolled to the bottom hides its own mistakes, so take the
    // manager to the first one rather than leaving them to hunt for the ring.
    const first = result.fields?.[0];
    if (first) {
      requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(
          `[data-field="${first}"]`,
        );
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        target
          ?.querySelector<HTMLElement>("input, select, textarea")
          ?.focus({ preventScroll: true });
      });
    }
  }

  /** Why the server rejected this field, if it did. */
  const errorFor = (field: string) =>
    fieldErrors[field] ??
    (missing.includes(field) ? "This field is required." : null);

  return (
    <form
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
      onSubmit={(event) => {
        event.preventDefault();
        void submit("draft");
      }}
    >
      <div className="space-y-6">
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-status-rose/30 bg-status-rose-bg px-4 py-3 text-sm text-status-rose"
          >
            {error}
          </div>
        ) : null}

        {/* --- 1. Job overview -------------------------------------- */}
        <Section id="overview" title="Job overview">
          <Pair>
            <Flagged field="title" message={errorFor("title")}>
              <Field
                label="Job title"
                required
                value={form.title}
                onChange={(v) => set("title", v)}
                placeholder="e.g. Senior Accountant"
              />
            </Flagged>
            <Flagged field="role_category" message={errorFor("role_category")}>
              <Select
                label="Role category"
                required
                value={form.role_category}
                onChange={(v) => set("role_category", v)}
                options={options.role_categories}
                placeholder="Role category"
              />
            </Flagged>
          </Pair>

          <Pair>
            <Field
              label="Ideal start date"
              type="date"
              value={form.ideal_start_date}
              onChange={(v) => set("ideal_start_date", v)}
            />
            <Field
              label="Application closing date"
              type="date"
              value={form.closes_at}
              onChange={(v) => set("closes_at", v)}
            />
          </Pair>

          <TextArea
            label="Company short description"
            rows={3}
            value={form.about_company}
            onChange={(v) => set("about_company", v)}
            placeholder="Tell candidates a bit about the company"
          />

          <Flagged field="description" message={errorFor("description")}>
            <TextArea
              label="Job description"
              rows={6}
              value={form.description}
              onChange={(v) => set("description", v)}
              placeholder="What the role is, who it suits and what the work looks like day to day."
            />
          </Flagged>
        </Section>

        {/* --- 2. Employer details ---------------------------------- */}
        <Section id="employer" title="Employer details">
          <Pair>
            <Flagged field="company" message={errorFor("company")}>
              <Field
                label="Hiring company"
                required
                value={form.company}
                onChange={(v) => set("company", v)}
                placeholder="Hiring company"
              />
            </Flagged>
            <Field
              label="Company industry"
              value={form.company_industry}
              onChange={(v) => set("company_industry", v)}
              placeholder="e.g. Financial services"
            />
          </Pair>

          <Pair>
            <Field
              label="Employer location"
              value={form.company_location}
              onChange={(v) => set("company_location", v)}
              placeholder="Employer location"
            />
            <Field
              label="Job location"
              value={form.location}
              onChange={(v) => set("location", v)}
              placeholder="Where the work is based"
            />
          </Pair>

          <div>
            <Label>Company HR contact details</Label>
            <Pair>
              <Flagged field="hr_email" message={errorFor("hr_email")}>
                <Field
                  label="Email"
                  type="email"
                  value={form.hr_email}
                  onChange={(v) => set("hr_email", v)}
                  placeholder="Email"
                />
              </Flagged>
              <Field
                label="Cellphone number"
                type="tel"
                value={form.hr_phone}
                onChange={(v) => set("hr_phone", v)}
                placeholder="Cellphone number"
              />
            </Pair>
          </div>
        </Section>

        {/* --- 3. Work setup ---------------------------------------- */}
        <Section id="work_setup" title="Work setup">
          <Pair>
            <Select
              label="Employment type"
              required
              value={form.employment_type}
              onChange={(v) => set("employment_type", v)}
              options={options.employment_type}
              placeholder="Employment type"
            />
            <Select
              label="Work setup"
              required
              value={form.work_setup}
              onChange={(v) => set("work_setup", v)}
              options={options.work_setup}
              placeholder="Work setup"
            />
          </Pair>

          <Pair>
            <Select
              label="Employer timezone"
              value={form.timezone_label}
              onChange={(v) => set("timezone_label", v)}
              options={options.timezone}
              placeholder="Employer timezone"
            />
            <Field
              label="Candidate location requirement"
              value={form.candidate_location}
              onChange={(v) => set("candidate_location", v)}
              placeholder="e.g. Anywhere in South Africa"
            />
          </Pair>

          <RadioGroup
            legend="Night shift required?"
            inline
            value={form.night_shift}
            onChange={(v) => set("night_shift", v)}
            options={options.night_shift}
          />

          <div>
            <Label>Working hours</Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Select
                hideLabel
                className="w-32"
                label="Working hours start"
                value={form.working_hours_start}
                onChange={(v) => set("working_hours_start", v)}
                options={HOURS}
                placeholder="00:00"
              />
              <span className="text-sm text-ink-muted">to</span>
              <Select
                hideLabel
                className="w-32"
                label="Working hours end"
                value={form.working_hours_end}
                onChange={(v) => set("working_hours_end", v)}
                options={HOURS}
                placeholder="00:00"
              />
            </div>
            <div className="mt-3">
              <Checkbox
                label="Flexible working hours"
                checked={flexibleHours}
                onChange={setFlexibleHours}
              />
            </div>
          </div>
        </Section>

        {/* --- 4. Candidate requirements ---------------------------- */}
        <Section id="candidate" title="Candidate requirements">
          <RadioGroup
            legend="Does the employer have specific citizenship requirements?"
            value={form.citizenship_requirement}
            onChange={(v) => set("citizenship_requirement", v)}
            options={options.citizenship_requirement}
          />

          <LanguageNeeds
            entries={languages}
            names={options.language}
            proficiencies={options.language_proficiency}
            onChange={setLanguages}
          />
        </Section>

        {/* --- 5. Experience requirements --------------------------- */}
        <Section id="experience" title="Experience requirements">
          <Pair>
            <Select
              label="Experience level needed"
              required
              value={form.experience_level}
              onChange={(v) => set("experience_level", v)}
              options={options.experience_level}
              placeholder="Experience level needed"
            />
            <Select
              label="Minimum years of experience"
              value={form.minimum_years_experience}
              onChange={(v) => set("minimum_years_experience", v)}
              options={options.years_experience}
              placeholder="Minimum years of experience"
            />
          </Pair>

          <Select
            label="Industry experience required"
            value={form.industry_experience}
            onChange={(v) => set("industry_experience", v)}
            options={options.industry_experience}
            placeholder="Industry experience required"
          />
        </Section>

        {/* --- 6. Education requirements ---------------------------- */}
        <Section id="education" title="Education requirements">
          <Pair>
            <Select
              label="Education requirements"
              value={form.education_requirement}
              onChange={(v) => set("education_requirement", v)}
              options={options.education_level}
              placeholder="Education requirements"
            />
            <Field
              label="Field of study"
              value={form.field_of_study}
              onChange={(v) => set("field_of_study", v)}
              placeholder="Field of study"
            />
          </Pair>
        </Section>

        {/* --- 7. Remuneration & benefits --------------------------- */}
        <Section id="remuneration" title="Remuneration &amp; benefits">
          <div>
            <Label>Salary range</Label>
            <p className="mt-0.5 text-xs text-ink-subtle">
              What the role pays, and whether that is per month or per year.
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Select
                hideLabel
                className="w-24"
                label="Salary currency"
                value={form.salary_currency}
                onChange={(v) => set("salary_currency", v)}
                options={options.currency}
                required
              />
              <input
                type="number"
                min="0"
                value={form.salary_min}
                onChange={(e) => set("salary_min", e.target.value)}
                aria-label="Minimum salary"
                placeholder="12 345"
                className="min-w-28 flex-1 rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none"
              />
              <span className="text-sm text-ink-muted">to</span>
              <input
                type="number"
                min="0"
                value={form.salary_max}
                onChange={(e) => set("salary_max", e.target.value)}
                aria-label="Maximum salary"
                placeholder="23 456"
                className="min-w-28 flex-1 rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none"
              />
              <Select
                hideLabel
                className="w-36"
                label="Salary period"
                value={form.salary_period}
                onChange={(v) => set("salary_period", v)}
                options={options.salary_period}
                placeholder="Per month / year"
              />
            </div>
          </div>

          <Field
            label="How the salary is shown to candidates"
            value={form.salary_label}
            onChange={(v) => set("salary_label", v)}
            placeholder="e.g. Market-related"
          />

          <TokenList
            label="Employee benefits"
            placeholder="Benefits offered"
            options={options.benefits}
            values={benefits}
            onChange={setBenefits}
          />
        </Section>

        {/* --- 8. Job responsibilities ------------------------------ */}
        <Section id="responsibilities" title="Job responsibilities">
          <BulletList
            label="Job responsibilities include:"
            placeholder="Enter a description…"
            items={responsibilities}
            onChange={setResponsibilities}
          />
        </Section>

        {/* --- 9. Skills & tools ------------------------------------ */}
        <Section id="skills" title="Skills &amp; tools">
          <SkillList
            label="Skills"
            entries={skills}
            proficiencies={options.proficiency}
            importances={SKILL_IMPORTANCE}
            onChange={setSkills}
          />
          <ToolList
            label="Software tools"
            entries={tools}
            proficiencies={options.proficiency}
            onChange={setTools}
          />
        </Section>
      </div>

      {/* --- The completion panel ----------------------------------- */}
      <aside className="space-y-4 lg:sticky lg:top-4">
        <div className="rounded-2xl border border-line bg-card p-5">
          <h2 className="text-base font-semibold text-ink-strong">
            Completion progress
          </h2>

          <div className="mt-4 flex justify-center">
            <ProgressCircle
              value={completion}
              size="lg"
              label="Job post"
              title="How much of the posting is filled in"
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
            <span className="text-xs text-ink-muted">Job status</span>
            <StatusBadge label="Draft" tone="purple" />
          </div>

          <ul className="mt-3 space-y-1.5">
            {SECTIONS.map((section) => {
              const done = (progress[section.id] ?? 0) >= 100;
              const started = (progress[section.id] ?? 0) > 0;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        done
                          ? "bg-status-green"
                          : started
                            ? "bg-status-yellow"
                            : "bg-line-strong",
                      )}
                    />
                    <span className="flex-1">{section.label}</span>
                    {started && !done ? (
                      <span className="text-xs text-ink-subtle">
                        {progress[section.id]}%
                      </span>
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            disabled={busy}
            onClick={() => void submit(editing ? "draft" : "active")}
            className="mt-5 w-full rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-800 disabled:opacity-60"
          >
            {busy
              ? editing
                ? "Saving…"
                : "Publishing…"
              : editing
                ? "Save changes"
                : "Publish job"}
          </button>
          {editing ? null : (
            <button
              type="submit"
              disabled={busy}
              className="mt-2 w-full rounded-lg border border-line-strong bg-card px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-card-muted disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save draft"}
            </button>
          )}

          <Link
            href={editing ? `/manager/jobs/${job?.id}` : "/manager/jobs"}
            className="mt-4 block text-center text-sm font-medium text-status-rose hover:underline"
          >
            {editing ? "Cancel" : "Cancel job creation"}
          </Link>
        </div>
      </aside>
    </form>
  );
}

/* --- Repeating inputs ------------------------------------------------ */

function LanguageNeeds({
  entries,
  names,
  proficiencies,
  onChange,
}: {
  entries: LanguageNeed[];
  names: Option[];
  proficiencies: Option[];
  onChange: (next: LanguageNeed[]) => void;
}) {
  const [language, setLanguage] = useState("");
  const [proficiency, setProficiency] = useState("");
  const taken = new Set(entries.map((entry) => entry.language));

  return (
    <div>
      <Label>Language requirements</Label>

      {entries.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entries.map((entry, index) => (
            <Token
              key={entry.language}
              prefix={
                proficiencies.find((p) => p.value === entry.proficiency)?.label
              }
              label={entry.language}
              onRemove={() => onChange(entries.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div className="min-w-44 flex-1">
          <Select
            label="Language name"
            value={language}
            onChange={setLanguage}
            options={names.filter((name) => !taken.has(name.value))}
            placeholder="Language name"
          />
        </div>
        <div className="min-w-40 flex-1">
          <Select
            label="Proficiency"
            value={proficiency}
            onChange={setProficiency}
            options={proficiencies}
            placeholder="Proficiency"
          />
        </div>
        <AddButton
          disabled={!language || !proficiency}
          onClick={() => {
            onChange([...entries, { language, proficiency }]);
            setLanguage("");
            setProficiency("");
          }}
        />
      </div>
    </div>
  );
}

function TokenList({
  label,
  placeholder,
  options,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: Option[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const remaining = options.filter((option) => !values.includes(option.value));
  const labelOf = (value: string) =>
    options.find((option) => option.value === value)?.label ?? value;

  return (
    <div>
      <Label>{label}</Label>
      {values.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Token
              key={value}
              label={labelOf(value)}
              onRemove={() => onChange(values.filter((v) => v !== value))}
            />
          ))}
        </div>
      ) : null}
      <Select
        hideLabel
        className="mt-2"
        label={label}
        placeholder={placeholder}
        value=""
        onChange={(picked) => picked && onChange([...values, picked])}
        options={remaining}
        required
      />
    </div>
  );
}

function BulletList({
  label,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div>
      <Label required>{label}</Label>

      {items.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-start gap-3 rounded-lg bg-card-muted px-3 py-2 text-sm text-ink"
            >
              <span className="flex-1">{item}</span>
              <button
                type="button"
                aria-label={`Remove: ${item}`}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="shrink-0 text-ink-subtle transition-colors hover:text-status-rose"
              >
                <Icon name="close" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2">
        <TextArea
          value={draft}
          onChange={setDraft}
          placeholder={placeholder}
          rows={3}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <AddButton
          disabled={!draft.trim()}
          onClick={() => {
            onChange([...items, draft.trim()]);
            setDraft("");
          }}
        />
      </div>
    </div>
  );
}

function SkillList({
  label,
  entries,
  proficiencies,
  importances,
  onChange,
}: {
  label: string;
  entries: Skill[];
  proficiencies: Option[];
  importances: Option[];
  onChange: (next: Skill[]) => void;
}) {
  const [draft, setDraft] = useState<Skill>({
    name: "",
    proficiency: "",
    importance: "required",
  });

  return (
    <div>
      <Label required>{label}</Label>

      {entries.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entries.map((entry, index) => (
            <Token
              key={`${entry.name}-${index}`}
              prefix={
                proficiencies.find((p) => p.value === entry.proficiency)?.label
              }
              label={entry.name}
              onRemove={() => onChange(entries.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <Field
            label="Skill name"
            value={draft.name}
            onChange={(name) => setDraft((d) => ({ ...d, name }))}
            placeholder="Skill name"
          />
        </div>
        <div className="min-w-36">
          <Select
            label="Proficiency"
            value={draft.proficiency}
            onChange={(proficiency) => setDraft((d) => ({ ...d, proficiency }))}
            options={proficiencies}
            placeholder="Proficiency"
          />
        </div>
        <div className="min-w-36">
          <Select
            label="Importance"
            value={draft.importance}
            onChange={(importance) => setDraft((d) => ({ ...d, importance }))}
            options={importances}
          />
        </div>
        <AddButton
          disabled={!draft.name.trim()}
          onClick={() => {
            onChange([...entries, { ...draft, name: draft.name.trim() }]);
            setDraft({ name: "", proficiency: "", importance: "required" });
          }}
        />
      </div>
    </div>
  );
}

function ToolList({
  label,
  entries,
  proficiencies,
  onChange,
}: {
  label: string;
  entries: Tool[];
  proficiencies: Option[];
  onChange: (next: Tool[]) => void;
}) {
  const [draft, setDraft] = useState<Tool>({ name: "", proficiency: "" });

  return (
    <div>
      <Label required>{label}</Label>

      {entries.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entries.map((entry, index) => (
            <Token
              key={`${entry.name}-${index}`}
              prefix={
                proficiencies.find((p) => p.value === entry.proficiency)?.label
              }
              label={entry.name}
              onRemove={() => onChange(entries.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <Field
            label="Software name"
            value={draft.name}
            onChange={(name) => setDraft((d) => ({ ...d, name }))}
            placeholder="Software name"
          />
        </div>
        <div className="min-w-36">
          <Select
            label="Proficiency"
            value={draft.proficiency}
            onChange={(proficiency) => setDraft({ ...draft, proficiency })}
            options={proficiencies}
            placeholder="Proficiency"
          />
        </div>
        <AddButton
          disabled={!draft.name.trim()}
          onClick={() => {
            onChange([...entries, { ...draft, name: draft.name.trim() }]);
            setDraft({ name: "", proficiency: "" });
          }}
        />
      </div>
    </div>
  );
}
