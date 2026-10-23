"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";

/** Our own event: localStorage does not notify the tab that wrote it. */
const CHANGED = "moc:sidebar-changed";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  // Another tab writing the same key fires this one.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readOpen(storageKey: string): boolean {
  try {
    // Absent or unreadable storage simply means "open", the default.
    return window.localStorage.getItem(storageKey) !== "closed";
  } catch {
    return true;
  }
}

/**
 * The shell layout, with a sidebar the user can close and reopen.
 *
 * Both shells are built from this. The rail and the page stay server
 * components — they arrive as `sidebar` and `children`, so opening a posting
 * still streams from the server; only the open/closed state is client-side.
 *
 * The toggle lives in the header rather than floating over the rail, so it
 * sits in the same place whether the sidebar is open or shut.
 *
 * The choice is remembered per browser under `storageKey`: a manager who
 * closes the rail to read a wide table does not want it back on every
 * navigation. It renders open and corrects itself on mount, because
 * localStorage cannot be read during SSR and defaulting to closed would
 * make the rail flash away for everyone who never touched the toggle.
 */
function Toggle({
  open,
  onClick,
  label,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? `Close the ${label}` : `Open the ${label}`}
      title={open ? `Close the ${label}` : `Open the ${label}`}
      className="mr-1 hidden size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-card-muted hover:text-ink lg:grid"
    >
      <Icon
        name="sidebar"
        className={cn("size-4 transition-transform", !open && "rotate-180")}
      />
    </button>
  );
}

export function SidebarLayout({
  sidebar,
  nav,
  children,
  storageKey,
  width = "w-72",
  sidebarClassName,
  navClassName = "gap-1",
  label = "sidebar",
}: {
  sidebar: ReactNode;
  /**
   * The row of links in the sticky header, beside the toggle.
   *
   * Omit it and there is no header at all — the manager frames put every
   * way of getting around in the rail and leave the page itself clean, so
   * a bar holding nothing but a collapse button would be a strip of
   * chrome the design does not have. The toggle moves into the rail.
   */
  nav?: ReactNode;
  children: ReactNode;
  /** Per-shell, so the manager and candidate rails remember separately. */
  storageKey: string;
  /** Tailwind width of the open rail. */
  width?: string;
  sidebarClassName?: string;
  /** Spacing of the header row, which differs between the two shells. */
  navClassName?: string;
  label?: string;
}) {
  /*
   * Read through useSyncExternalStore rather than setting state from an
   * effect. Setting it in an effect renders the rail open, then immediately
   * again closed — a cascading render React now warns about. This renders
   * open on the server (the serverSnapshot) and resolves to the stored
   * value during hydration instead.
   */
  const open = useSyncExternalStore(
    subscribe,
    () => readOpen(storageKey),
    () => true,
  );

  function toggle() {
    try {
      window.localStorage.setItem(storageKey, open ? "closed" : "open");
    } catch {
      /* the rail still works, it just will not be remembered */
    }
    // localStorage fires no event in the tab that wrote it, so tell the
    // subscribers ourselves.
    window.dispatchEvent(new Event(CHANGED));
  }

  return (
    <div className="flex min-h-dvh">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-out lg:flex",
          open ? width : "w-0",
          sidebarClassName,
        )}
      >
        {/* Kept mounted while closed, so reopening is instant and the rail
            does not re-fetch. The zero width hides it; aria-hidden takes it
            out of the accessibility tree so a screen reader does not read a
            rail that is not there. */}
        <div
          aria-hidden={!open}
          className={cn("flex h-full w-full flex-col", !open && "invisible")}
        >
          {sidebar}
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {nav ? (
          <header className="sticky top-0 z-10 border-b border-line bg-card/90 px-5 py-3 backdrop-blur">
            <nav className="flex items-center gap-1">
              <Toggle open={open} onClick={toggle} label={label} />
              <div className={cn("flex min-w-0 flex-1 items-center", navClassName)}>
                {nav}
              </div>
            </nav>
          </header>
        ) : (
          /* No header to sit in, so the toggle floats over the top-left of
             the page — the only chrome on a screen the design keeps clean. */
          <div className="absolute left-2 top-3 z-10 hidden lg:block">
            <Toggle open={open} onClick={toggle} label={label} />
          </div>
        )}

        <main className={cn("flex-1 px-5 py-7", !nav && "lg:pl-12")}>
          {children}
        </main>
      </div>
    </div>
  );
}
