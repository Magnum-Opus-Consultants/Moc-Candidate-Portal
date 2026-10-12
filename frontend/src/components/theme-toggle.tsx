"use client";

import { useSyncExternalStore } from "react";

import { cn } from "@/components/ui/primitives";

/**
 * Light/dark switch.
 *
 * localStorage is an external store, so the component subscribes to it rather
 * than mirroring it into state — that keeps the server and client renders
 * consistent through hydration. The theme is applied before paint by the
 * inline script in the root layout, so there is no flash on load.
 *
 * The Development Plan has the choice remembered against the user's account
 * across devices. That needs the accounts work on Day 2; when it lands, write
 * through to the API in setTheme and this component keeps its shape.
 */

type Theme = "system" | "light" | "dark";

export const THEME_KEY = "moc-theme";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", emit);
  };
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // Private windows and blocked site data: fall back to the device setting.
    return "system";
  }
}

function serverTheme(): Theme {
  return "system";
}

function setTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Not fatal — the theme still applies for this page view.
  }
  emit();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);

  return (
    <div className="flex rounded-lg border border-line bg-card p-0.5">
      {(["system", "light", "dark"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setTheme(option)}
          aria-pressed={theme === option}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs capitalize transition-colors",
            theme === option
              ? "bg-brand-100 font-medium text-brand-700"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
