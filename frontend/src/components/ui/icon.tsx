/**
 * Inline icon set.
 *
 * Kept as hand-written paths rather than an icon package: the designs use a
 * small, fixed set, and inlining avoids shipping a library for sixteen glyphs.
 * All icons are drawn on a 24x24 grid with a 1.75 stroke so they sit evenly
 * next to 14px text.
 */

export type IconName =
  | "file"
  | "search"
  | "filter"
  | "plus"
  | "chevron-down"
  | "chevron-right"
  | "bookmark"
  | "logout"
  | "dashboard"
  | "applications"
  | "recommended"
  | "saved"
  | "profile"
  | "settings"
  | "bell"
  | "archive"
  | "building"
  | "calendar"
  | "clock"
  | "edit"
  | "download"
  | "share"
  | "list"
  | "grid"
  | "check"
  | "close"
  | "refresh"
  | "mail"
  | "phone"
  | "expand"
  | "sparkle"
  | "users"
  | "pin"
  | "wallet"
  | "external"
  | "copy"
  | "trash"
  | "sidebar"
  | "home"
  | "arrow-left"
  | "lock";

const PATHS: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  // From the design system's own icon set (Untitled UI), scaled from the
  // 20px grid Figma exports to the 24px grid this component draws on.
  home: (
    <path d="M8 17H16M11.0177 2.764L4.2354 8.0391C3.782 8.3918 3.5553 8.5681 3.392 8.7889C3.2474 8.9845 3.1396 9.2048 3.074 9.4391C3 9.7035 3 9.9907 3 10.5651V17.8C3 18.9202 3 19.4802 3.218 19.908C3.4097 20.2843 3.7157 20.5903 4.092 20.782C4.5198 21 5.0799 21 6.2 21H17.8C18.9202 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9202 21 17.8V10.5651C21 9.9907 21 9.7035 20.926 9.4391C20.8604 9.2048 20.7527 8.9845 20.608 8.7889C20.4446 8.5681 20.218 8.3918 19.7646 8.0391L12.9823 2.764C12.631 2.4908 12.4553 2.3541 12.2614 2.3016C12.0902 2.2553 11.9098 2.2553 11.7387 2.3016C11.5447 2.3541 11.369 2.4908 11.0177 2.764Z" />
  ),
  "arrow-left": <path d="M19 12H5M12 5L5 12L12 19" />,
  // lock-01 from the design system, scaled from its 16px grid.
  lock: (
    <path d="M16.9999 10V8C16.9999 5.2386 14.7614 3 12 3C9.2386 3 7 5.2386 7 8V10M12 14.5V16.5M8.8 21H15.2C16.8801 21 17.7203 21 18.362 20.673C18.9264 20.3854 19.3854 19.9264 19.673 19.362C19.9999 18.7203 19.9999 17.8802 19.9999 16.2V14.8C19.9999 13.1198 19.9999 12.2798 19.673 11.638C19.3854 11.0735 18.9264 10.6146 18.362 10.327C17.7203 10 16.8801 10 15.2 10H8.8C7.1198 10 6.2798 10 5.638 10.327C5.0735 10.6146 4.6146 11.0735 4.327 11.638C4 12.2798 4 13.1198 4 14.8V16.2C4 17.8802 4 18.7203 4.327 19.362C4.6146 19.9264 5.0735 20.3854 5.638 20.673C6.2798 21 7.1198 21 8.8 21Z" />
  ),
  sidebar: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M10 4v16" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a1 1 0 0 1 1-1h9" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />,
  logout: (
    <>
      <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
      <path d="M10 8 6 12l4 4M6 12h9" />
    </>
  ),
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  applications: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 13h6M9 17h4" />
    </>
  ),
  recommended: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </>
  ),
  saved: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />,
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10.5 19a2 2 0 0 0 3 0" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  archive: (
    <>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17z" />
      <path d="m14 6 4 4" />
    </>
  ),
  download: <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />,
  share: (
    <>
      <path d="M12 4v12M12 4 8 8M12 4l4 4" />
      <path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
    </>
  ),
  list: <path d="M4 6h16M4 12h16M4 18h16" />,
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  check: <path d="m5 13 4 4L19 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  refresh: (
    <>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15" />
      <path d="M4 20v-5h5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  phone: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1z" />
  ),
  expand: <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />,
  sparkle: (
    <path d="M12 3l1.8 4.9L19 10l-5.2 2.1L12 17l-1.8-4.9L5 10l5.2-2.1z" />
  ),
  pin: (
    <>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M16.5 14.5h.01" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.2a3.5 3.5 0 0 1 0 5.6M18 20a6 6 0 0 0-3-5.2" />
    </>
  ),
};

export function Icon({
  name,
  className = "size-4",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Filled variant, used for the saved state on bookmark buttons. */
export function BookmarkFilled({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
    </svg>
  );
}
