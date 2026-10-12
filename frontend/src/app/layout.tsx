import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";

/** Poppins is the typeface on moc-pty.com; the portal follows it. */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Careers at Magnum Opus Consultants",
    template: "%s | Magnum Opus Consultants",
  },
  description:
    "World-class South African talent, global impact. Browse open positions at Magnum Opus Consultants, build a profile and apply.",
};

/**
 * Applies a saved theme before first paint, so a user who chose one does not
 * see the other flash first. Runs ahead of hydration, which is why it is
 * inline rather than a component.
 *
 * The document ships as data-theme="light": the portal defaults to light
 * rather than following the device. Dark is still available — picking it in
 * Settings sets data-theme="dark", and picking System clears the attribute so
 * prefers-color-scheme takes over again. The Development Plan has first visits
 * following the device, so this default is the one line to change back.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("moc-theme");var r=document.documentElement;if(t==="dark")r.setAttribute("data-theme","dark");else if(t==="system")r.removeAttribute("data-theme");}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-ZA"
      data-theme="light"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/*
        suppressHydrationWarning on <body> as well as <html>: the attribute
        only covers one level, and browser extensions commonly inject onto
        <body> (ColorZilla's cz-shortcut-listen, Grammarly's data-gr-*) before
        React hydrates.
      */}
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
