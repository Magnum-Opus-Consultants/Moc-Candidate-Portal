"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProfileSectionRow } from "@/components/job-cards";
import { PageSkeleton } from "@/components/states";
import { Icon } from "@/components/ui/icon";
import { ProgressCircle } from "@/components/ui/progress-circle";
import {
  Avatar,
  Button,
  Card,
  Chip,
  PROFILE_STRENGTH,
  PageHeading,
  SectionHeading,
  StatusBadge,
} from "@/components/ui/primitives";
import { api, type CandidateProfile } from "@/lib/api";

const EXPERIENCE_LEVELS: [string, string][] = [
  ["entry", "Entry-level"],
  ["junior", "Junior"],
  ["intermediate", "Intermediate"],
  ["senior", "Senior"],
  ["specialist", "Specialist"],
  ["team_lead", "Team Lead"],
  ["manager", "Manager"],
  ["executive", "Executive"],
];

const WORK_SETUPS: [string, string][] = [
  ["hybrid", "Hybrid"],
  ["remote", "Remote"],
  ["office", "Office"],
];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [roleCategory, setRoleCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [workSetup, setWorkSetup] = useState("");
  const [skills, setSkills] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function hydrate(p: CandidateProfile) {
    setProfile(p);
    setName(p.user.name);
    setPhone(p.user.phone ?? "");
    setHeadline(p.headline ?? "");
    setLocation(p.location ?? "");
    setSummary(p.summary ?? "");
    setRoleCategory(p.role_category ?? "");
    setExperience(p.experience_level ?? "");
    setWorkSetup(p.preferred_work_setup ?? "");
    setSkills((p.skills ?? []).join(", "));
  }

  useEffect(() => {
    api.candidateProfile().then((r) => {
      if (r.ok) hydrate(r.data);
      setLoading(false);
    });
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await api.updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      headline: headline.trim(),
      location: location.trim(),
      summary: summary.trim(),
      role_category: roleCategory.trim(),
      experience_level: experience,
      preferred_work_setup: workSetup,
      skills,
    });
    setSaving(false);
    if (res.ok) {
      hydrate(res.data);
      setSaved(true);
      router.refresh(); // dashboard + sidebar reflect the new completion
    } else {
      setError(res.error);
    }
  }

  if (loading) return <PageSkeleton />;
  if (!profile)
    return (
      <Card className="p-6 text-sm text-ink-muted">
        We couldn&apos;t load your profile. Please sign in again.
      </Card>
    );

  const strength =
    PROFILE_STRENGTH[profile.strength] ?? PROFILE_STRENGTH.getting_started;

  return (
    <div className="space-y-8">
      <PageHeading
        title="My Profile"
        subtext="Fill in your details — your completion rises as you go."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* Editable details. */}
        <div className="space-y-6">
          <Card className="flex flex-wrap items-center gap-4 p-5">
            <Avatar initials={profile.user.initials} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-strong">{profile.user.name}</p>
              <p className="text-sm text-ink-muted">
                {profile.headline || "Add a headline below"}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-subtle">
                <Icon name="mail" className="size-3.5" />
                {profile.user.email}
              </p>
            </div>
          </Card>

          <form onSubmit={save}>
            <SectionHeading
              title="Your details"
              subtext="Everything here feeds your profile completion"
            />
            <Card className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" value={name} onChange={setName} required />
                <Field label="Phone" value={phone} onChange={setPhone} placeholder="+27 …" />
              </div>
              <Field
                label="Headline"
                value={headline}
                onChange={setHeadline}
                placeholder="e.g. Senior Backend Engineer"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Location"
                  value={location}
                  onChange={setLocation}
                  placeholder="e.g. Pretoria"
                />
                <Field
                  label="Role category"
                  value={roleCategory}
                  onChange={setRoleCategory}
                  placeholder="e.g. Engineering"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Experience level"
                  value={experience}
                  onChange={setExperience}
                  options={EXPERIENCE_LEVELS}
                />
                <Select
                  label="Preferred work setup"
                  value={workSetup}
                  onChange={setWorkSetup}
                  options={WORK_SETUPS}
                />
              </div>
              <Textarea
                label="Professional summary"
                value={summary}
                onChange={setSummary}
                placeholder="A few lines about your experience and what you're looking for."
              />
              <Field
                label="Skills"
                value={skills}
                onChange={setSkills}
                placeholder="Comma separated, e.g. Python, Django, SQL"
                hint="Separate skills with commas."
              />

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {saving ? "Saving…" : "Save profile"}
                </button>
                {error ? (
                  <span className="text-sm text-status-rose">{error}</span>
                ) : saved ? (
                  <span className="text-sm text-status-green">
                    Saved — completion updated.
                  </span>
                ) : null}
              </div>
            </Card>
          </form>

          <section>
            <SectionHeading
              title="Profile sections"
              subtext="Each section contributes to your overall completion"
            />
            <Card className="divide-y divide-line">
              {profile.sections.map((section) => (
                <ProfileSectionRow key={section.slug} section={section} />
              ))}
            </Card>
          </section>
        </div>

        {/* Completion panel. */}
        <aside className="lg:sticky lg:top-4">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-ink-strong">
                Profile strength
              </h2>
              <StatusBadge label={strength.label} tone={strength.tone} />
            </div>
            <div className="mt-5 flex justify-center">
              <ProgressCircle
                value={profile.completion}
                size="xl"
                label="Complete"
                title="Profile completion"
              />
            </div>
            <p className="mt-5 text-center text-sm leading-relaxed text-ink-muted">
              {profile.can_download_branded_cv
                ? "You can download your MOC-branded CV."
                : `The MOC-branded CV unlocks at 80% — ${80 - profile.completion}% to go.`}
            </p>
            <Button
              size="sm"
              className="mt-4 w-full"
              variant={profile.can_download_branded_cv ? "primary" : "outline"}
              disabled={!profile.can_download_branded_cv}
            >
              <Icon name="download" className="size-3.5" />
              Download branded CV
            </Button>
            {profile.skills.length > 0 ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-subtle">
                  Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill) => (
                    <Chip key={skill}>{skill}</Chip>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}

/* --- Inputs ---------------------------------------------------------------- */

function Field({
  label,
  value,
  onChange,
  hint,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-strong">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
        className="mt-1.5 w-full rounded-md border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
      />
      {hint ? <span className="mt-1 block text-xs text-ink-subtle">{hint}</span> : null}
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-strong">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        {...props}
        className="mt-1.5 w-full rounded-md border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-strong">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
      >
        <option value="">Select…</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
