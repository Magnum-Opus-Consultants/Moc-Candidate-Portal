"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import { api, relativeDays, type AutomaticEmail } from "@/lib/api";

/**
 * The automatic emails, as a list.
 *
 * It used to render every email as an open form, one under the other —
 * fourteen subject fields and fourteen textareas on one page. Finding the
 * one you wanted meant scrolling past the ones you didn't, and nothing on
 * screen told you what the list contained without reading all of it.
 *
 * A row says the four things worth knowing at a glance: what it is, when
 * it fires, whether it is on, and how often it has gone out. Editing gets
 * a page of its own.
 */
export function EmailList({ emails }: { emails: AutomaticEmail[] }) {
  if (emails.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-card p-10 text-center text-sm text-ink-muted">
        No automatic emails yet.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-line-soft overflow-hidden rounded-2xl bg-card shadow-xs">
      {emails.map((email) => (
        <EmailRow key={email.id} email={email} />
      ))}
    </ol>
  );
}

function EmailRow({ email }: { email: AutomaticEmail }) {
  const router = useRouter();
  const [active, setActive] = useState(email.is_active);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !active;
    const result = await api.saveEmail(email.id, { is_active: next });
    setBusy(false);
    if (result.ok) {
      setActive(next);
      router.refresh();
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4">
      <div className="min-w-56 flex-1">
        <h3 className="text-[15px] font-semibold leading-6 text-ink-strong">
          <Link
            href={`/manager/emails/${email.id}`}
            className="transition-colors hover:text-brand-700"
          >
            {email.label}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-xs text-ink-subtle">
          {email.subject}
        </p>
      </div>

      <p className="min-w-44 text-xs text-ink-muted">
        <span className="text-ink-subtle">Sends when: </span>
        {email.trigger_label}
        {Object.entries(email.conditions ?? {}).map(([key, value]) => (
          <span key={key} className="text-ink-subtle">
            {" "}
            · {key} is {Array.isArray(value) ? value.join(" or ") : String(value)}
          </span>
        ))}
      </p>

      <p className="w-28 text-xs text-ink-subtle">
        Sent {email.send_count}{" "}
        {email.send_count === 1 ? "time" : "times"}
        <br />
        <span>updated {relativeDays(email.updated_at).toLowerCase()}</span>
      </p>

      {/*
        A switch rather than a checkbox labelled "Active": turning an email
        off is the one change a manager makes without wanting to read the
        wording, so it belongs on the row.
      */}
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        role="switch"
        aria-checked={active}
        aria-label={`${active ? "Switch off" : "Switch on"} ${email.label}`}
        className={cn(
          "inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60",
          active ? "border-brand-700 bg-brand-700" : "border-line-strong bg-card-muted",
        )}
      >
        <span
          className={cn(
            "size-4 rounded-full bg-card shadow-sm transition-transform",
            active ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>

      <Link
        href={`/manager/emails/${email.id}`}
        className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
      >
        Edit
        <Icon
          name="chevron-right"
          className="size-3.5 transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  );
}
