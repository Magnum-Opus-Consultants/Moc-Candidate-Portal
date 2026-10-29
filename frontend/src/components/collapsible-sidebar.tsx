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
 * The toggle sits in the rail itself, top-right, beside whatever that shell
 * puts at the top - the logo for a candidate, the profile row for a manager.
 * It cannot stay there when the rail is shut, because the rail is then zero
 * width, so a single button takes its place at the edge of the page: the one
 * piece of chrome needed to get the rail back.
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
  tone = "light",
}: {
  open: boolean;
  onClick: () => void;
  label: string;
  /** The manager rail is near-black, so its toggle needs the rail's inks. */
  tone?: "light" | "dark";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? `Close the ${label}` : `Open the ${label}`}
      title={open ? `Close the ${label}` : `Open the ${label}`}
      className={cn(
        "hidden size-8 place-items-center rounded-lg transition-colors lg:grid",
        tone === "dark"
          ? "text-sidebar-ink-muted hover:bg-sidebar-hover hover:text-sidebar-ink"
          : "text-ink-muted hover:bg-card-muted hover:text-ink",
      )}
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
  tone = "light",
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
  /** Matches the toggle to the rail it sits on. */
  tone?: "light" | "dark";
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
          "relative",
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

        {open ? (
          /* top-6 centres it on the rail's first row in both shells: the
             candidate logo and the manager profile avatar. */
          <div className="absolute right-3 top-6 z-20">
            <Toggle open onClick={toggle} label={label} tone={tone} />
          </div>
        ) : null}
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* The bar is 92px on the frame, and fixed rather than grown from its
            contents: a page that hides the search box was rendering an 88px
            bar, which pushed its heading 4px off every other page. */}
        {nav ? (
          <header className="sticky top-0 z-10 flex min-h-[92px] items-center bg-line px-8 py-6">
            {/* w-full because the frame's bar is justify-between: without a
                width the nav shrank to its contents and the bell and avatar
                sat mid-header instead of against the right edge. */}
            <nav className={cn("flex w-full min-w-0 items-center", navClassName)}>
              {/* Takes its place in the row rather than floating over it:
                  absolutely positioned, it landed on top of the search. */}
              {!open ? (
                <Toggle open={false} onClick={toggle} label={label} />
              ) : null}
              {nav}
            </nav>
          </header>
        ) : (
          /* No header to sit in, so while the rail is shut the one button
             that brings it back floats at the top-left of the page. */
          !open && (
            <div className="absolute left-2 top-3 z-20 hidden lg:block">
              <Toggle open={false} onClick={toggle} label={label} />
            </div>
          )
        )}

        <main className="flex-1 px-5 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
