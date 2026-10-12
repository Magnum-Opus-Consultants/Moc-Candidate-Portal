import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { NavLinkActive } from "@/components/nav-link-active";
import { NAV_LINK_STYLES, type NavVariant } from "@/components/nav-link-styles";
import { cn } from "@/components/ui/primitives";

/**
 * A link that knows whether it is the current page.
 *
 * The active state comes from usePathname, which is runtime data, so the
 * client half is wrapped in Suspense. The fallback is the same link in its
 * idle state: the nav prerenders and paints immediately, then the current
 * item highlights as the path streams in. Nothing moves.
 */
export function NavLink({
  href,
  children,
  variant = "sidebar",
  exact = false,
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: NavVariant;
  /** Match the path exactly — for index routes like /portal and /manager. */
  exact?: boolean;
  className?: string;
}) {
  const style = NAV_LINK_STYLES[variant];

  return (
    <Suspense
      fallback={
        <Link href={href} className={cn(style.base, style.idle, className)}>
          {children}
        </Link>
      }
    >
      <NavLinkActive
        href={href}
        variant={variant}
        exact={exact}
        className={className}
      >
        {children}
      </NavLinkActive>
    </Suspense>
  );
}
