/** Shared between the server wrapper and the client half of NavLink. */

export type NavVariant = "sidebar" | "navy" | "tab";

export const NAV_LINK_STYLES: Record<
  NavVariant,
  { base: string; active: string; idle: string }
> = {
  sidebar: {
    base: "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
    active: "bg-brand-100 font-medium text-brand-700",
    idle: "text-ink-muted hover:bg-card-muted hover:text-ink",
  },
  navy: {
    // Smaller than the light-sidebar links: the rail carries a long list of
    // job titles, so the type is sized to fit more of each one.
    base: "flex items-start gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
    // The rail's own accent, not the page's brand blue.
    active: "bg-sidebar-hover font-medium text-sidebar-ink",
    idle: "text-sidebar-ink-muted hover:bg-sidebar-hover hover:text-sidebar-ink",
  },
  tab: {
    base: "rounded-lg px-3 py-1.5 text-sm transition-colors",
    active: "bg-brand-100 font-medium text-brand-700",
    idle: "text-ink-muted hover:bg-card-muted hover:text-ink",
  },
};
