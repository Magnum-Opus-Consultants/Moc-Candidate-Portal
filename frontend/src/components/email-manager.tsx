"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EmailList } from "@/components/email-list";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Card,
  EmptyState,
  StatusBadge,
  cn,
} from "@/components/ui/primitives";
import {
  api,
  formatDate,

  type AutomaticEmail,
  type EmailLogEntry,
  type EmailTrigger,
} from "@/lib/api";

/**
 * The automatic emails page: what the portal sends, and what it has sent.
 *
 * Two halves, because they answer different questions. "Emails" is the
 * wording that will go out next time; "Sent" is the record of what actually
 * went out, kept as it was worded at the time — editing an email must not
 * rewrite what a candidate already received.
 */
export function EmailManager({
  emails,
  triggers,
  log,
}: {
  emails: AutomaticEmail[];
  triggers: EmailTrigger[];
  log: EmailLogEntry[];
}) {
  const [tab, setTab] = useState<"emails" | "log">("emails");
  const [adding, setAdding] = useState(false);

  const failed = log.filter((entry) => entry.status === "failed").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-card-muted p-1">
          <TabButton active={tab === "emails"} onClick={() => setTab("emails")}>
            Emails
            <Count>{emails.length}</Count>
          </TabButton>
          <TabButton active={tab === "log"} onClick={() => setTab("log")}>
            Sent
            <Count>{log.length}</Count>
          </TabButton>
        </div>

        {tab === "emails" ? (
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => setAdding((open) => !open)}
          >
            <Icon name={adding ? "close" : "plus"} className="size-3.5" />
            {adding ? "Cancel" : "New email"}
          </Button>
        ) : failed > 0 ? (
          <span className="ml-auto text-xs text-status-rose">
            {failed} failed to send
          </span>
        ) : null}
      </div>

      {tab === "emails" ? (
        <>
          {adding ? (
            <NewEmailForm
              triggers={triggers}
              onDone={() => setAdding(false)}
            />
          ) : null}
          <EmailList emails={emails} />
        </>
      ) : (
        <SentLog log={log} />
      )}
    </div>
  );
}

/* --- Emails ---------------------------------------------------------------- */

function NewEmailForm({
  triggers,
  onDone,
}: {
  triggers: EmailTrigger[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [trigger, setTrigger] = useState(triggers[0]?.value ?? "");
  const [conditions, setConditions] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = triggers.find((row) => row.value === trigger);

  async function create() {
    setBusy(true);
    setError(null);

    const result = await api.createEmail({
      label,
      trigger,
      subject,
      body,
      conditions,
    });
    setBusy(false);

    if (result.ok) {
      onDone();
      router.refresh();
      return;
    }
    setError(result.error);
  }

  return (
    <Card className="border-brand-300 p-5">
      <h2 className="font-semibold text-ink-strong">New automatic email</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Choose when it sends, then write it. It goes out from
        careers@moc-pty.com like the others.
      </p>

      <div className="mt-4 space-y-3">
        <Labelled label="Name">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Interview invitation"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
          />
        </Labelled>

        <Labelled label="Send it when">
          <select
            value={trigger}
            onChange={(event) => {
              setTrigger(event.target.value);
              // Conditions belong to a trigger; keeping them across a change
              // would silently apply a rule the new trigger cannot evaluate.
              setConditions({});
            }}
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
          >
            {triggers.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </select>
        </Labelled>

        {chosen?.conditions.map((rule) => (
          <Labelled key={rule.field} label={rule.label}>
            <select
              value={conditions[rule.field] ?? ""}
              onChange={(event) =>
                setConditions((current) => {
                  const next = { ...current };
                  if (event.target.value) next[rule.field] = event.target.value;
                  else delete next[rule.field];
                  return next;
                })
              }
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
            >
              <option value="">Every time</option>
              {rule.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Labelled>
        ))}

        <Labelled label="Subject">
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="We would like to meet you about {job_title}"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
          />
        </Labelled>

        <Labelled label="Wording">
          <textarea
            rows={7}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={"Hi {candidate_name},\n\n…\n\nThe MOC Talent Team"}
            className="w-full rounded-lg border border-line bg-card px-3 py-2 font-mono text-sm leading-relaxed text-ink focus:border-brand-500 focus:outline-none"
          />
        </Labelled>
      </div>

      <Placeholders trigger={chosen} />

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button size="sm" onClick={create} disabled={busy}>
          {busy ? "Adding…" : "Add email"}
        </Button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
        {error ? (
          <span role="alert" className="text-xs text-status-rose">
            {error}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

/* --- Sent log -------------------------------------------------------------- */

function SentLog({ log }: { log: EmailLogEntry[] }) {
  const [open, setOpen] = useState<number | null>(null);

  if (log.length === 0) {
    return (
      <EmptyState
        title="Nothing sent yet"
        body="Automatic emails appear here as they go out, with the wording each one carried."
      />
    );
  }

  return (
    <Card className="divide-y divide-line">
      {log.map((entry) => (
        <div key={entry.id}>
          <button
            type="button"
            onClick={() => setOpen(open === entry.id ? null : entry.id)}
            className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-card-muted"
          >
            <StatusBadge
              label={entry.status_label}
              tone={entry.status === "sent" ? "green" : "grey"}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-strong">
                {entry.subject}
              </p>
              <p className="truncate text-xs text-ink-subtle">
                {entry.recipient} · {entry.trigger_label}
                {entry.about ? ` · ${entry.about}` : ""}
              </p>
            </div>
            <span className="text-xs text-ink-subtle">
              {formatDate(entry.created_at)}
            </span>
            <Icon
              name="chevron-down"
              className={cn(
                "size-4 text-ink-subtle transition-transform",
                open === entry.id && "rotate-180",
              )}
            />
          </button>

          {open === entry.id ? (
            <div className="border-t border-line bg-card-muted px-4 py-3">
              {entry.error ? (
                <p className="mb-2 text-xs text-status-rose">{entry.error}</p>
              ) : null}
              <p className="text-xs text-ink-subtle">
                As it was worded when sent
                {entry.template_label ? ` · ${entry.template_label}` : ""}
              </p>
              <pre className="mt-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-muted">
                {entry.body}
              </pre>
            </div>
          ) : null}
        </div>
      ))}
    </Card>
  );
}

/* --- Small pieces ---------------------------------------------------------- */

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function Placeholders({ trigger }: { trigger?: EmailTrigger }) {
  if (!trigger || trigger.placeholders.length === 0) return null;
  return (
    <p className="mt-3 text-xs text-ink-subtle">
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
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-card font-medium text-ink-strong shadow-sm"
          : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-card-muted px-1.5 text-xs text-ink-subtle">
      {children}
    </span>
  );
}
