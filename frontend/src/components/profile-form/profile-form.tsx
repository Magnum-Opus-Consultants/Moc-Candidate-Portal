"use client";

/**
 * "Complete your profile" — the eight-section creation form.
 *
 * One page with every section on it rather than a wizard: the completion
 * panel beside it links to each card, and the seeker can fill them in any
 * order and save as they go, which is what the designs show.
 *
 * Dropdown choices come from /api/options/ so they always match what the
 * database will accept.
 */

import { useEffect, useMemo, useState } from "react";

import { CompletionPanel } from "@/components/profile-form/completion-panel";
import { CvUpload } from "@/components/profile-form/cv-upload";
import { PhotoUpload } from "@/components/profile-form/photo-upload";
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
import { EducationEditor } from "@/components/profile-form/education-editor";
import { ExperienceEditor } from "@/components/profile-form/experience-editor";
import { cn } from "@/components/ui/primitives";
import {
  api,
  type CandidateProfile,
  type ProfileOptions,
  type ProfileSection,
} from "@/lib/api";

type Draft = Record<string, unknown>;

function labelFor(options: Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function ProfileForm({
  initialProfile,
  options,
  brandedCv = false,
}: {
  initialProfile: CandidateProfile;
  options: ProfileOptions;
  /** Offer the 80% branded-CV download in the side panel ("My Profile"). */
  brandedCv?: boolean;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = Object.keys(draft).length > 0;

  // Warn before losing unsaved edits — the form is long enough to be costly.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Current value: the unsaved edit if there is one, else what is saved. */
  function value<T = string>(key: string, fallback: T): T {
    if (key in draft) return draft[key] as T;
    const current = (profile as unknown as Record<string, unknown>)[key];
    return (current ?? fallback) as T;
  }

  function set(key: string, next: unknown) {
    setDraft((d) => ({ ...d, [key]: next }));
    setSaved(false);
  }

  /**
   * Apply what a parsed CV offers.
   *
   * Into the draft, not the profile: the candidate sees the values in the
   * form as unsaved edits and presses Save themselves. Anything they have
   * already typed in this sitting wins — the CV fills gaps, it does not
   * overwrite a correction.
   */
  function applySuggestions(suggestions: Record<string, unknown>) {
    setDraft((d) => {
      const next = { ...d };
      const current = profile as unknown as Record<string, unknown>;

      for (const [key, incoming] of Object.entries(suggestions)) {
        // An edit made in this sitting always wins.
        if (key in next) continue;

        /*
         * So does anything already on the profile. Uploading a CV onto a
         * finished profile used to overwrite it — and when the CV was the
         * MOC-branded one we generate, that replaced a candidate's name
         * with our letterhead. Filling a blank is help; replacing an
         * answer they gave is not.
         */
        const saved = key === "name" ? profile.user.name : current[key];
        const alreadySet = Array.isArray(saved)
          ? saved.length > 0
          : saved !== null && saved !== undefined && saved !== "";
        if (alreadySet) continue;

        next[key] = incoming;
      }
      return next;
    });
    setSaved(false);
  }

  const text = (key: string) => value<string>(key, "");
  const list = <T,>(key: string) => value<T[]>(key, []);

  async function save() {
    setSaving(true);
    setError(null);
    const result = await api.updateCandidateProfile(draft);
    if (result.ok) {
      setProfile(result.data);
      setDraft({});
      setSaved(true);
    } else {
      setError(result.error);
    }
    setSaving(false);
  }

  const name = useMemo(
    () => value<string>("name", profile.user.name),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, profile],
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[auto_minmax(0,1fr)_320px]">
      <SectionRail sections={profile.sections} />
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <CvUpload onSuggestions={applySuggestions} />

        {/* --- 1. Personal details ------------------------------------- */}
        <Section id="personal_details" title="Personal details">
          <PhotoUpload
            url={profile.photo_url}
            initials={profile.user.initials}
          />

          <Pair>
            <Field
              label="Name and surname"
              required
              value={name}
              onChange={(v) => set("name", v)}
              placeholder="Your full name"
            />
            <Field
              label="Preferred name"
              value={text("preferred_name")}
              onChange={(v) => set("preferred_name", v)}
              placeholder="What should we call you?"
            />
          </Pair>

          <Pair>
            <Field
              label="Cellphone number"
              required
              type="tel"
              value={value<string>("phone", profile.user.phone)}
              onChange={(v) => set("phone", v)}
              placeholder="+27 ..."
            />
            <Field
              label="Email"
              required
              type="email"
              value={value<string>("email", profile.user.email)}
              onChange={(v) => set("email", v)}
              placeholder="you@example.com"
            />
          </Pair>

          <Pair>
            <Select
              label="Country of residence"
              required
              value={text("country_of_residence")}
              onChange={(v) => set("country_of_residence", v)}
              options={options.country}
              placeholder="Country"
            />
            <Field
              label="Location"
              value={text("location")}
              onChange={(v) => set("location", v)}
              placeholder="City / town"
            />
          </Pair>

          <RadioGroup
            legend="Current profile status"
            value={text("profile_status")}
            onChange={(v) => set("profile_status", v)}
            options={options.profile_status}
            inline={false}
          />

          <LanguagePicker
            names={options.language}
            proficiencies={options.language_proficiency}
            languages={list<{ language: string; proficiency: string }>("languages")}
            onChange={(next) => set("languages", next)}
          />

          <Pair>
            <Field
              label="LinkedIn profile (optional)"
              type="url"
              value={text("linkedin_url")}
              onChange={(v) => set("linkedin_url", v)}
              placeholder="LinkedIn profile link"
            />
            <Field
              label="Portfolio / website link (optional)"
              type="url"
              value={text("portfolio_url")}
              onChange={(v) => set("portfolio_url", v)}
              placeholder="Portfolio / website link"
            />
          </Pair>
        </Section>

        {/* --- 2. Optional EE information ------------------------------ */}
        <Section id="ee_information" title="Optional EE information">
          <p className="-mt-2 text-xs leading-relaxed text-ink-subtle">
            Every field here is optional. It is used for employment equity
            reporting only and never affects how your profile is matched.
          </p>

          <Pair>
            <Select
              label="Gender"
              value={text("gender")}
              onChange={(v) => set("gender", v)}
              options={options.gender}
            />
            <Select
              label="Nationality"
              value={text("nationality")}
              onChange={(v) => set("nationality", v)}
              options={options.nationality}
            />
          </Pair>

          <Pair>
            <Select
              label="Citizenship"
              value={text("citizenship")}
              onChange={(v) => set("citizenship", v)}
              options={options.citizenship}
            />
            <Select
              label="Ethnicity"
              value={text("ethnicity")}
              onChange={(v) => set("ethnicity", v)}
              options={options.ethnicity}
            />
          </Pair>

          <RadioGroup
            legend="Do you have a disability?"
            value={
              value<boolean | null>("has_disability", null) === null
                ? ""
                : value<boolean | null>("has_disability", null)
                  ? "yes"
                  : "no"
            }
            onChange={(v) => set("has_disability", v === "yes")}
            options={[
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
            ]}
            inline={false}
          />

          <TextArea
            label="Please tell us more"
            value={text("disability_detail")}
            onChange={(v) => set("disability_detail", v)}
            placeholder="Tell us more about your disability"
          />
        </Section>

        {/* --- 3. Career details --------------------------------------- */}
        <Section id="career_details" title="Career details">
          {/*
            The job title, which is the line under the name on the branded
            candidate profile. It was writable on the API and shown on every
            hiring manager screen, but there was nowhere to enter it, so it
            was always blank unless a parsed CV happened to supply it.
          */}
          <Field
            label="Current or desired job title"
            value={text("headline")}
            onChange={(v) => set("headline", v)}
            placeholder="e.g. Export Operations Coordinator"
          />
          <Select
            label="Primary role category"
            required
            value={text("role_category")}
            onChange={(v) => set("role_category", v)}
            options={options.role_categories}
            placeholder="Primary role category you are interested in"
          />
          <Select
            label="Secondary role category (optional)"
            value={text("secondary_role_category")}
            onChange={(v) => set("secondary_role_category", v)}
            options={options.role_categories}
            placeholder="Secondary role category you are interested in"
          />

          <Pair>
            <Select
              label="Current employment status"
              required
              value={text("employment_status")}
              onChange={(v) => set("employment_status", v)}
              options={options.employment_status}
            />
            <Select
              label="Availability"
              required
              value={text("availability")}
              onChange={(v) => set("availability", v)}
              options={options.availability}
            />
          </Pair>

          <Pair>
            <Select
              label="Experience level"
              required
              value={text("experience_level")}
              onChange={(v) => set("experience_level", v)}
              options={options.experience_level}
            />
            <Select
              label="Working type preference"
              required
              value={text("preferred_work_setup")}
              onChange={(v) => set("preferred_work_setup", v)}
              options={options.work_setup}
            />
          </Pair>

          <Select
            label="Time zone availability"
            required
            value={text("timezone_availability")}
            onChange={(v) => set("timezone_availability", v)}
            options={options.timezone}
          />

          <RadioGroup
            legend="Are you willing to work night shift?"
            required
            value={text("night_shift")}
            onChange={(v) => set("night_shift", v)}
            options={options.night_shift}
          />
        </Section>

        {/* --- 4. Education -------------------------------------------- */}
        <Section id="education" title="Education">
          <EducationEditor
            entries={list("education")}
            levels={options.education_level}
            onChange={(next) => set("education", next)}
          />
        </Section>

        {/* --- 5. Experience ------------------------------------------- */}
        <Section id="experience" title="Experience">
          <ExperienceEditor
            entries={list("experience")}
            employmentTypes={options.employment_type}
            onChange={(next) => set("experience", next)}
          />
        </Section>

        {/* --- 6. Remuneration & benefits ------------------------------ */}
        <Section id="remuneration" title="Remuneration &amp; benefits">
          <SalaryRow
            currencies={options.currency}
            label="Current or most recent salary"
            currency={value<string>("current_salary_currency", "ZAR")}
            amount={String(value<string | number>("current_salary_amount", "") ?? "")}
            period={text("current_salary_period")}
            periods={options.salary_period}
            onCurrency={(v) => set("current_salary_currency", v)}
            onAmount={(v) => set("current_salary_amount", v)}
            onPeriod={(v) => set("current_salary_period", v)}
          />
          <SalaryRow
            currencies={options.currency}
            label="Expected gross salary"
            currency={value<string>("expected_salary_currency", "ZAR")}
            amount={String(value<string | number>("expected_salary_amount", "") ?? "")}
            period={text("expected_salary_period")}
            periods={options.salary_period}
            onCurrency={(v) => set("expected_salary_currency", v)}
            onAmount={(v) => set("expected_salary_amount", v)}
            onPeriod={(v) => set("expected_salary_period", v)}
          />

          <TokenPicker
            label="Employee benefits"
            placeholder="Select benefits that matter to you"
            options={options.benefits}
            values={list<string>("benefits")}
            onChange={(next) => set("benefits", next)}
            render={(v) => labelFor(options.benefits, v)}
          />
        </Section>

        {/* --- 7. Skills & tools --------------------------------------- */}
        <Section id="skills_tools" title="Skills &amp; tools">
          <SkillPicker
            label="Skills"
            entries={list<{ name: string; proficiency: string; importance?: string }>(
              "skills",
            )}
            proficiencies={options.proficiency}
            importances={options.importance}
            onChange={(next) => set("skills", next)}
          />
          <SkillPicker
            label="Software tools"
            entries={list<{ name: string; proficiency: string }>("software_tools")}
            proficiencies={options.proficiency}
            onChange={(next) => set("software_tools", next)}
          />
        </Section>

        {/* --- 8. Privacy & profile sharing ---------------------------- */}
        <Section id="privacy_sharing" title="Privacy &amp; profile sharing">
          <Field
            label="Please don't share my profile with:"
            value={text("do_not_share_with")}
            onChange={(v) => set("do_not_share_with", v)}
            placeholder="Don't share my profile with…"
          />
          <Checkbox
            checked={value<boolean>("sharing_agreed", false)}
            onChange={(v) => set("sharing_agreed", v)}
            label={
              <span className="leading-relaxed">
                I agree that Magnum Opus Consultants may share my profile with
                hiring companies for the purpose of recruitment, except those
                named above, and may keep it on file to contact me about future
                opportunities.
              </span>
            }
          />
        </Section>
      </form>

      <CompletionPanel
        completion={profile.completion}
        strength={profile.strength}
        sections={profile.sections}
        saving={saving}
        dirty={dirty}
        onSave={save}
        error={error}
        saved={saved}
        brandedCv={brandedCv}
      />
    </div>
  );
}

/* --- Pieces ---------------------------------------------------------------- */
/**
 * The progress rail down the left edge.
 *
 * One dot per section, filled as that section is completed, and each one
 * jumps to its card. The dot alone says nothing to a screen reader, so every
 * link carries the section name and how far along it is.
 */
function SectionRail({ sections }: { sections: ProfileSection[] }) {
  return (
    <nav
      aria-label="Profile sections"
      className="sticky top-6 hidden h-fit flex-col items-center gap-1 rounded-full bg-card px-1 py-2.5 xl:flex"
    >
      {sections.map((section) => (
        <a
          key={section.slug}
          href={`#${section.slug}`}
          title={`${section.label} — ${section.progress}% complete`}
          className="group grid size-5 place-items-center rounded-full transition-colors hover:bg-card-muted"
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full transition-colors",
              section.completed
                ? "bg-brand-700"
                : section.progress > 0
                  ? "bg-status-yellow"
                  : "bg-line-strong",
              "group-hover:bg-brand-400",
            )}
          />
          <span className="sr-only">
            {section.label}, {section.progress}% complete
          </span>
        </a>
      ))}
    </nav>
  );
}

function LanguagePicker({
  languages,
  names,
  proficiencies,
  onChange,
}: {
  languages: Array<{ language: string; proficiency: string }>;
  /** The languages on offer, from /api/options/. */
  names: Option[];
  proficiencies: Option[];
  onChange: (next: Array<{ language: string; proficiency: string }>) => void;
}) {
  const [name, setName] = useState("");
  const [proficiency, setProficiency] = useState("");

  // One entry per language: offering one already in the list invites a
  // duplicate with a different proficiency.
  const taken = new Set(languages.map((l) => l.language));
  const available = names.filter((option) => !taken.has(option.value));

  return (
    <div>
      <Label>What languages do you speak?</Label>

      {languages.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {languages.map((l, i) => (
            <Token
              key={`${l.language}-${i}`}
              prefix={labelFor(proficiencies, l.proficiency)}
              label={l.language}
              onRemove={() => onChange(languages.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div className="min-w-44 flex-1">
          <Select
            label="Language name"
            value={name}
            onChange={setName}
            options={available}
            placeholder="Language name"
          />
        </div>
        <div className="min-w-40 flex-1">
          <Select
            label="Proficiency"
            value={proficiency}
            onChange={setProficiency}
            options={proficiencies}
          />
        </div>
        <AddButton
          disabled={!name || !proficiency}
          onClick={() => {
            onChange([...languages, { language: name, proficiency }]);
            setName("");
            setProficiency("");
          }}
        />
      </div>
    </div>
  );
}

function SalaryRow({
  label,
  currencies,
  currency,
  amount,
  period,
  periods,
  onCurrency,
  onAmount,
  onPeriod,
}: {
  label: string;
  currencies: Option[];
  currency: string;
  amount: string;
  period: string;
  periods: Option[];
  onCurrency: (v: string) => void;
  onAmount: (v: string) => void;
  onPeriod: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {/* "Period" on its own read as a mystery: it says whether the figure
          beside it is per month or per year. */}
      <p className="mt-0.5 text-xs text-ink-subtle">
        The amount, and whether it is per month or per year.
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <Select
          hideLabel
          className="w-28"
          label={`${label} currency`}
          value={currency}
          onChange={onCurrency}
          options={currencies}
          required
        />
        <input
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          aria-label={`${label} amount`}
          placeholder="12 345"
          className="min-w-32 flex-1 rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none"
        />
        <Select
          hideLabel
          className="w-36"
          label={`${label} period`}
          placeholder="Per month / year"
          value={period}
          onChange={onPeriod}
          options={periods}
        />
      </div>
    </div>
  );
}

function TokenPicker({
  label,
  placeholder,
  options,
  values,
  onChange,
  render,
}: {
  label: string;
  placeholder: string;
  options: Option[];
  values: string[];
  onChange: (next: string[]) => void;
  render: (value: string) => string;
}) {
  const remaining = options.filter((o) => !values.includes(o.value));

  return (
    <div>
      <Label>{label}</Label>
      {values.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Token
              key={v}
              label={render(v)}
              onRemove={() => onChange(values.filter((x) => x !== v))}
            />
          ))}
        </div>
      ) : null}
      {/* Always reads as empty: picking adds a token rather than setting a
          value, so there is nothing for it to show as chosen. */}
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

function SkillPicker({
  label,
  entries,
  proficiencies,
  importances,
  onChange,
}: {
  label: string;
  entries: Array<{ name: string; proficiency: string; importance?: string }>;
  proficiencies: Option[];
  importances?: Option[];
  onChange: (
    next: Array<{ name: string; proficiency: string; importance?: string }>,
  ) => void;
}) {
  const [name, setName] = useState("");
  const [proficiency, setProficiency] = useState("");
  const [importance, setImportance] = useState("");

  return (
    <div>
      <Label>{label}</Label>

      {entries.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entries.map((entry, i) => (
            <Token
              key={`${entry.name}-${i}`}
              prefix={labelFor(proficiencies, entry.proficiency)}
              label={entry.name}
              onRemove={() => onChange(entries.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <Field
            label={label === "Skills" ? "Skill name" : "Software name"}
            value={name}
            onChange={setName}
            placeholder={label === "Skills" ? "Skill name" : "Software name"}
          />
        </div>
        <div className="min-w-36 flex-1">
          <Select
            label="Proficiency"
            value={proficiency}
            onChange={setProficiency}
            options={proficiencies}
          />
        </div>
        {importances ? (
          <div className="min-w-36 flex-1">
            <Select
              label="Importance"
              value={importance}
              onChange={setImportance}
              options={importances}
            />
          </div>
        ) : null}
        <AddButton
          disabled={!name.trim() || !proficiency}
          onClick={() => {
            const entry: { name: string; proficiency: string; importance?: string } = {
              name: name.trim(),
              proficiency,
            };
            if (importances) entry.importance = importance;
            onChange([...entries, entry]);
            setName("");
            setProficiency("");
            setImportance("");
          }}
        />
      </div>
    </div>
  );
}
