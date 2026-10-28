"use client";

import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

/**
 * Watches for the portal coming back, and reloads when it does.
 *
 * The design's developer notes ask for a poll every 30–60 seconds and an
 * automatic reload once the platform is up, so somebody who leaves the tab
 * open is let back in without having to think about it.
 *
 * 45 seconds: often enough to feel attentive, rare enough that a few
 * hundred people parked on this page do not themselves become the load
 * that keeps the portal down.
 *
 * It calls the health endpoint directly rather than going through the
 * Next server, because during maintenance the Next server may be the thing
 * that is down.
 */
const EVERY_MS = 45_000;

export function MaintenanceWatcher() {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (document.hidden) return; // a background tab is nobody waiting
      setChecking(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/health/`, {
          cache: "no-store",
        });
        if (!cancelled && response.ok) window.location.reload();
      } catch {
        /* still down — that is the expected case, so say nothing */
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    const timer = setInterval(check, EVERY_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <span role="status">
      {checking
        ? "Checking whether the portal is back…"
        : "This page checks every 45 seconds and will reload itself once we’re back."}
    </span>
  );
}
