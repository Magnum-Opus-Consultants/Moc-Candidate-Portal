"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { api } from "@/lib/api";

/**
 * Signs the visitor out once they have been idle, and shows them why.
 *
 * The server enforces the same window (api.middleware.IdleSessionMiddleware)
 * and is what actually ends the session — a timer in a browser can be paused,
 * throttled or closed, so it is not a control. What this adds is the part the
 * server cannot do: noticing at the moment the window passes and replacing
 * the page, rather than leaving a signed-in-looking screen up until the next
 * click fails.
 *
 * Mounted in both portal shells, so it covers every signed-in page.
 */

/**
 * Kept just under the server's 30 minutes. If the two were equal the server
 * would sometimes win the race and the next request would 403 before this
 * had a chance to explain anything.
 */
const IDLE_MS = 29 * 60 * 1000;

/**
 * How often to compare. A one-minute tick rather than a timer per event:
 * a timer reset on every mousemove is thousands of cleared timeouts a
 * minute, and the window does not need second precision.
 */
const TICK_MS = 30 * 1000;

/**
 * Shared across tabs. Without this, reading a long job description in one tab
 * while another sits untouched would sign you out from the idle one, which
 * from the person's point of view is simply wrong — they were using the site.
 */
const ACTIVITY_KEY = "moc:last-activity";

const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "wheel",
  "touchstart",
] as const;

function stamp(now: number) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(now));
  } catch {
    // Private windows and blocked site data both throw. The in-memory value
    // still works; only cross-tab sharing is lost.
  }
}

function lastActivity(fallback: number): number {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? Math.max(parsed, fallback) : fallback;
  } catch {
    return fallback;
  }
}

export function IdleTimeout() {
  const router = useRouter();
  /**
   * 0 until the effect runs, never Date.now().
   *
   * A clock read here is evaluated during the prerender rather than on each
   * visit, so every visitor would inherit the build's idea of "now" — and
   * Next refuses to prerender the route over it. The effect sets the real
   * value on mount, before the first tick can fire.
   */
  const localLast = useRef(0);
  const firing = useRef(false);

  useEffect(() => {
    const now = Date.now();
    localLast.current = now;
    stamp(now);

    function touch() {
      const at = Date.now();
      localLast.current = at;
      // Only write every so often: these events fire continuously while
      // somebody scrolls, and localStorage writes are synchronous.
      if (at - Number(lastActivity(0)) > 15_000) stamp(at);
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, touch, { passive: true });
    }

    // Coming back to a tab is itself activity, and is also the moment a
    // throttled background timer catches up.
    function onVisible() {
      if (document.visibilityState === "visible") touch();
    }
    document.addEventListener("visibilitychange", onVisible);

    async function expire() {
      if (firing.current) return;
      firing.current = true;
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, touch);
      }
      // Ask the server to end it too. If the call fails the session has
      // almost certainly expired there already, which is the same outcome.
      try {
        await api.logout();
      } catch {
        // Nothing useful to do — we are leaving the page regardless.
      }
      // replace, not push: the signed-in page behind this is gone, and Back
      // should not appear to return to it.
      router.replace("/signed-out");
      router.refresh();
    }

    const tick = window.setInterval(() => {
      const since = lastActivity(localLast.current);
      // Belt and braces: an unset stamp means we do not know how long it has
      // been, and "signed out immediately on load" is a far worse failure
      // than "stayed signed in one tick too long".
      if (!since) return;
      if (Date.now() - since >= IDLE_MS) void expire();
    }, TICK_MS);

    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, touch);
      }
    };
  }, [router]);

  return null;
}
