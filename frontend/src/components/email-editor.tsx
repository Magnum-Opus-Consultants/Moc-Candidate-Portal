"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { RichTextEditor } from "@/components/rich-text-editor";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import { api, type AutomaticEmail, type EmailTrigger } from "@/lib/api";

/**
 * One automatic email, on a page of its own.
 *
 * Content on the left, a live preview on the right, as the Client's own
 * mailing tool does it. The preview is the point: the wording is plain
 * text with {placeholders} in it, and what a candidate actually receives
 * is that text with the placeholders filled and the paragraphs turned
 * into HTML. Editing blind and hoping is how a sentence ends up reading
 * "Hi {preferred_name}," in somebody's inbox.
 *
 * Sample values rather than live ones: a preview that fetched a real
 * candidate would show one person's details to whoever opened the page,
 * and tells you nothing extra about the wording.
 */

const SAMPLE: Record<string, string> = {
  preferred_name: "Thandi",
  first_name: "Thandi",
  candidate_name: "Thandi Mabaso",
  email: "thandi@example.com",
  provider_label: "Google",
  date: "23/10/2026",
  profile_percentage: "65",
  profile_status: "Getting started",
  missing_sections: "- Education\n- Skills & tools",
  job_title: "Senior Product Designer",
  company: "Meridian Health Group",
  job_reference: "MOC-1042",
  employment_type: "Full-time",
  work_setup: "Hybrid",
  working_hours: "09:00 – 17:00",
  employer_timezone: "UTC+2",
  closing_date: "21/11/2026",
  status_label: "Shortlisted",
  verify_url: "https://careers.demo.moc-pty.com/verify/…",
  reset_url: "https://careers.demo.moc-pty.com/reset-password?…",
  signin_url: "https://careers.demo.moc-pty.com/signin",
  profile_url: "https://careers.demo.moc-pty.com/portal/profile",
  cv_url: "https://careers.demo.moc-pty.com/portal/profile",
  job_url: "https://careers.demo.moc-pty.com/jobs/1042",
  application_url: "https://careers.demo.moc-pty.com/portal/applications",
};

/** Fill {placeholders} the way the server will, for the preview only. */
function fill(text: string): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in SAMPLE ? SAMPLE[key] : whole,
  );
}


/**
 * The same conversion the server does for a plain-text body: one
 * paragraph per blank line, a break per single newline. Used once, when a
 * manager moves a supplied template into the formatted editor.
 */
function textToHtml(text: string): string {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  return (text || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function EmailEditorPage({
  email,
  triggers,
}: {
  email: AutomaticEmail;
  triggers: EmailTrigger[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState(email.label);
  const [subject, setSubject] = useState(email.subject);
  const [preheader, setPreheader] = useState(email.preheader ?? "");
  const [body, setBody] = useState(email.body);
  const [isHtml, setIsHtml] = useState(email.body_is_html);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    label !== email.label ||
    subject !== email.subject ||
    preheader !== (email.preheader ?? "") ||
    body !== email.body ||
    isHtml !== email.body_is_html;

  const trigger = triggers.find((t) => t.value === email.trigger);
  const preview = useMemo(() => fill(body), [body]);

  async function save() {
    setBusy(true);
    setError(null);

    const result = await api.saveEmail(email.id, {
      label,
      subject,
      preheader,
      body,
      body_is_html: isHtml,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Link
        href="/manager/emails"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink-strong"
      >
        <Icon name="chevron-right" className="size-4 rotate-180" />
        All automatic emails
      </Link>

      <div className="rounded-2xl bg-card p-6 shadow-xs">
        <Field label="Name" required>
          <input
            maxLength={160}
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setSaved(false);
            }}
            className={INPUT}
          />
        </Field>
        <p className="mt-1.5 text-xs text-ink-subtle">
          Sends when: {email.trigger_label}
          {Object.entries(email.conditions ?? {}).map(([key, value]) => (
            <span key={key}>
              {" "}
              · {key} is{" "}
              {Array.isArray(value) ? value.join(" or ") : String(value)}
            </span>
          ))}
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* --- Content ------------------------------------------------- */}
        <div className="xl:col-span-2">
          <section className="overflow-hidden rounded-2xl bg-card shadow-xs">
            <div className="border-b border-line px-6 py-4">
              <h2 className="text-[15px] font-semibold text-ink-strong">
                Content
              </h2>
            </div>

            <div className="space-y-5 p-6">
              <Field label="Subject" required>
                <input
                  maxLength={200}
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setSaved(false);
                  }}
                  className={INPUT}
                />
              </Field>

              <Field label="Preheader">
                <input
                  maxLength={200}
                  value={preheader}
                  onChange={(e) => {
                    setPreheader(e.target.value);
                    setSaved(false);
                  }}
                  className={INPUT}
                  placeholder="The line shown beside the subject in an inbox"
                />
              </Field>

              <Field label="Wording">
                {isHtml ? (
                  <RichTextEditor
                    value={body}
                    ariaLabel="Email wording"
                    onChange={(html) => {
                      setBody(html);
                      setSaved(false);
                    }}
                  />
                ) : (
                  <textarea
                    rows={22}
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value);
                      setSaved(false);
                    }}
                    className={cn(
                      INPUT,
                      "resize-y font-mono text-[13px] leading-relaxed",
                    )}
                  />
                )}
              </Field>

              {!isHtml ? (
                /*
                  The supplied library is plain text. Converting is a one-way
                  door — the formatted version cannot go back to being the
                  Client's exact file — so it is a decision a manager makes
                  rather than something that happens the first time they type.
                */
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card-muted px-4 py-3">
                  <p className="flex-1 text-xs leading-relaxed text-ink-muted">
                    This wording is plain text, as the Client supplied it. Switch
                    to the formatted editor for bold, headings, lists and links.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBody(textToHtml(body));
                      setIsHtml(true);
                      setSaved(false);
                    }}
                    className="shrink-0 rounded-lg border border-line-strong bg-card px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:bg-card-muted"
                  >
                    Use the formatted editor
                  </button>
                </div>
              ) : null}

              {trigger && trigger.placeholders.length > 0 ? (
                <p className="text-xs text-ink-subtle">
                  Placeholders filled in when it sends:{" "}
                  {trigger.placeholders.map((name) => (
                    <code
                      key={name}
                      className="mr-1 rounded bg-card-muted px-1 py-0.5 font-mono"
                    >
                      {`{${name}}`}
                    </code>
                  ))}
                </p>
              ) : null}
            </div>
          </section>
        </div>

        {/* --- Live preview -------------------------------------------- */}
        <div>
          <section className="overflow-hidden rounded-2xl bg-card shadow-xs xl:sticky xl:top-4">
            <div className="border-b border-line px-6 py-4">
              <h2 className="text-[15px] font-semibold text-ink-strong">
                Live preview
              </h2>
            </div>

            <div className="p-6">
              <div className="overflow-hidden rounded-lg border border-line">
                <div className="border-b border-line bg-card-muted px-4 py-2.5 text-xs text-ink-muted">
                  <p>
                    <span className="font-semibold text-ink">Subject:</span>{" "}
                    {fill(subject)}
                  </p>
                  {preheader ? (
                    <p className="mt-1 truncate text-ink-subtle">
                      {fill(preheader)}
                    </p>
                  ) : null}
                </div>

                {isHtml ? (
                  /*
                    The markup is the editor's own output, already shown in
                    the panel beside this one, and the server sanitises it
                    again before it is sent. Rendering it here is what makes
                    the preview a preview.
                  */
                  <div
                    className="email-body bg-card px-4 py-4 text-sm leading-relaxed text-ink"
                    dangerouslySetInnerHTML={{ __html: preview }}
                  />
                ) : (
                  /*
                    whitespace-pre-line, because the server turns blank lines
                    into paragraphs and single newlines into breaks.
                    Rendering it any other way would preview something the
                    candidate never receives.
                  */
                  <div className="whitespace-pre-line bg-card px-4 py-4 text-sm leading-relaxed text-ink">
                    {preview}
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs text-ink-subtle">
                Placeholders are shown with sample values. The real ones are
                filled in when the email is sent.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* --- Save ------------------------------------------------------ */}
      <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-card px-6 py-4 shadow-xs">
        {error ? (
          <p role="alert" className="mr-auto text-sm text-status-rose">
            {error}
          </p>
        ) : saved && !dirty ? (
          <p role="status" className="mr-auto text-sm text-ink-muted">
            Saved. Every email sent from now on uses this wording.
          </p>
        ) : null}

        <Link
          href="/manager/emails"
          className="inline-flex h-10 items-center rounded-lg border border-line-strong bg-card px-5 text-sm font-semibold text-ink transition-colors hover:bg-card-muted"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="inline-flex h-10 items-center rounded-lg bg-brand-700 px-6 text-sm font-bold text-brand-ink transition-colors hover:bg-brand-800 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-line bg-card-muted px-4 py-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-strong">
        {label}
        {required ? <sup className="font-medium text-status-rose">*</sup> : null}
      </span>
      {children}
    </label>
  );
}
