"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Card, PageHeading, SectionHeading } from "@/components/ui/primitives";
import { api, type AuthUser, type MutationResult } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then((r) => {
      if (r.ok) setUser(r.data);
      setLoading(false);
    });
  }, []);

  function applyUser(u: AuthUser) {
    setUser(u);
    router.refresh(); // the sidebar + header read the same account
  }

  return (
    <div className="space-y-8">
      <PageHeading
        title="Settings"
        subtext="Your account details, appearance and account removal."
      />

      <section>
        <SectionHeading title="Account" />
        <Card className="divide-y divide-line">
          <NameRow user={user} loading={loading} onSaved={applyUser} />
          <EmailRow user={user} loading={loading} onSaved={applyUser} />
          <PasswordRow loading={loading} />
        </Card>
      </section>

      <section>
        <SectionHeading
          title="Appearance"
          subtext="On a first visit the portal follows your device setting."
        />
        <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-ink">Theme</p>
            <p className="text-xs text-ink-subtle">
              Light, dark, or match the device.
            </p>
          </div>
          <ThemeToggle />
        </Card>
      </section>

      <section>
        <SectionHeading title="Delete account" />
        <Card className="p-5">
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
            Deleting your account removes your access to the portal. As set out
            in the Statement of Work, your information is retained so MOC can
            contact you about future opportunities.
          </p>
          <DeleteAccount />
        </Card>
      </section>
    </div>
  );
}

/* --- Rows ------------------------------------------------------------------ */

function Row({
  label,
  hint,
  open,
  onToggle,
  children,
}: {
  label: string;
  hint: string;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{label}</p>
          <p className="text-xs text-ink-subtle">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-line-strong hover:bg-card-muted"
        >
          {open ? "Cancel" : "Change"}
        </button>
      </div>
      {open ? <div className="mt-4 max-w-md">{children}</div> : null}
    </div>
  );
}

function NameRow({
  user,
  loading,
  onSaved,
}: {
  user: AuthUser | null;
  loading: boolean;
  onSaved: (u: AuthUser) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const form = useSaver();

  return (
    <Row
      label="Name"
      hint={loading ? "Loading…" : user?.name || "Not set"}
      open={open}
      onToggle={() => {
        setName(user?.name ?? "");
        setOpen((v) => !v);
        form.reset();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.run(() => api.updateName(name.trim()), (u) => {
            onSaved(u as AuthUser);
            setOpen(false);
          });
        }}
        className="space-y-3"
      >
        <Input value={name} onChange={setName} placeholder="Your full name" required />
        <SaveBar state={form} label="Save name" />
      </form>
    </Row>
  );
}

function EmailRow({
  user,
  loading,
  onSaved,
}: {
  user: AuthUser | null;
  loading: boolean;
  onSaved: (u: AuthUser) => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const form = useSaver();

  return (
    <Row
      label="Email address"
      hint={loading ? "Loading…" : user?.email || "Used to sign in"}
      open={open}
      onToggle={() => {
        setEmail(user?.email ?? "");
        setOpen((v) => !v);
        form.reset();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.run(() => api.updateEmail(email.trim()), (u) => {
            onSaved(u as AuthUser);
            setOpen(false);
          });
        }}
        className="space-y-3"
      >
        <Input type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
        <SaveBar state={form} label="Save email" />
      </form>
    </Row>
  );
}

function PasswordRow({ loading }: { loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const form = useSaver();

  return (
    <Row
      label="Password"
      hint={loading ? "Loading…" : "Used to sign in"}
      open={open}
      onToggle={() => {
        setCurrent("");
        setNext("");
        setOpen((v) => !v);
        form.reset();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.run(
            () => api.changePassword(current, next),
            () => {
              setOpen(false);
            },
            "Password updated.",
          );
        }}
        className="space-y-3"
      >
        <Input
          type="password"
          value={current}
          onChange={setCurrent}
          placeholder="Current password"
          autoComplete="current-password"
          required
        />
        <Input
          type="password"
          value={next}
          onChange={setNext}
          placeholder="New password (min 8 characters)"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <SaveBar state={form} label="Update password" />
      </form>
    </Row>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (
      !window.confirm(
        "Delete your account? You will be signed out and lose access to the portal.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    const res = await api.deleteAccount();
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(res.error);
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-md border border-status-rose/40 px-3.5 py-2 text-sm font-medium text-status-rose transition-colors hover:bg-status-rose-bg disabled:opacity-60"
      >
        {busy ? "Deleting…" : "Delete my account"}
      </button>
      {error ? <p className="mt-2 text-sm text-status-rose">{error}</p> : null}
    </div>
  );
}

/* --- Small form helpers ---------------------------------------------------- */

type SaverState = {
  busy: boolean;
  error: string | null;
  done: string | null;
  reset: () => void;
  run: (
    call: () => Promise<MutationResult>,
    onOk: (data: unknown) => void,
    okMessage?: string,
  ) => Promise<void>;
};

function useSaver(): SaverState {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  return {
    busy,
    error,
    done,
    reset: () => {
      setBusy(false);
      setError(null);
      setDone(null);
    },
    run: async (call, onOk, okMessage) => {
      setBusy(true);
      setError(null);
      setDone(null);
      const res = await call();
      setBusy(false);
      if (res.ok) {
        setDone(okMessage ?? "Saved.");
        onOk(res.data);
      } else {
        setError(res.error);
      }
    },
  };
}

function SaveBar({ state, label }: { state: SaverState; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="submit"
        disabled={state.busy}
        className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-300"
      >
        {state.busy ? "Saving…" : label}
      </button>
      {state.error ? (
        <span className="text-sm text-status-rose">{state.error}</span>
      ) : state.done ? (
        <span className="text-sm text-status-green">{state.done}</span>
      ) : null}
    </div>
  );
}

function Input({
  value,
  onChange,
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
      className="w-full rounded-md border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
    />
  );
}
