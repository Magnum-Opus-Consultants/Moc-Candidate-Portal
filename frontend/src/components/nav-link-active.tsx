"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { NAV_LINK_STYLES, type NavVariant } from "@/components/nav-link-styles";
import { cn } from "@/components/ui/primitives";

/**
 * The half of NavLink that needs the current path.
 *
 * Kept apart from the server wrapper in nav-link.tsx because usePathname is
 * runtime data: under cacheComponents it must sit inside a Suspense boundary,
 * and the wrapper supplies one along with an idle-state fallback.
 */
export function NavLinkActive({
  href,
  children,
  variant,
  exact,
  className,
}: {
  href: string;
  children: ReactNode;
  variant: NavVariant;
  exact: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  const style = NAV_LINK_STYLES[variant];

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(style.base, active ? style.active : style.idle, className)}
    >
      {children}
    </Link>
  );
}
