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
    base: "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
    active: "bg-brand-700 font-medium text-white",
    idle: "text-brand-ink-muted hover:bg-brand-800 hover:text-brand-ink",
  },
  tab: {
    base: "rounded-lg px-3 py-1.5 text-sm transition-colors",
    active: "bg-brand-100 font-medium text-brand-700",
    idle: "text-ink-muted hover:bg-card-muted hover:text-ink",
  },
};
