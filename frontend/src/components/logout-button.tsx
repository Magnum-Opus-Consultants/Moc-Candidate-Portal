"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { api } from "@/lib/api";

/**
 * Ends the Django session for real, then returns to the public board. Used in
 * both portal shells in place of a plain link, so "Log out" actually signs out.
 */
export function LogoutButton({ className }: { className: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await api.logout();
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={className}>
      <Icon name="logout" />
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
