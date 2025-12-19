"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { useSession } from "@/components/session-context";
import { cn } from "@/lib/client/cn";
import { useStaggeredReveal } from "@/hooks/use-staggered-reveal";
import { BoothProfileButton } from "@/components/booth/booth-profile-button";

type NavItem = {
  href: string;
  label: string;
};

const DEFAULT_NAV: NavItem[] = [
  { href: "/feed", label: "피드" },
  { href: "/leaderboard", label: "리더보드" },
];

const ROLE_NAV: Partial<Record<UserRole, NavItem[]>> = {
  STUDENT: [
    { href: "/feed", label: "피드" },
    { href: "/leaderboard", label: "리더보드" },
    { href: "/student", label: "나의 기록" },
  ],
  BOOTH_MANAGER: [
    { href: "/feed", label: "피드" },
    { href: "/booth/visits", label: "방문 현황" },
  ],
  ADMIN: [
    { href: "/feed", label: "피드" },
    { href: "/admin/dashboard", label: "운영 현황" },
    { href: "/admin/accounts", label: "계정 허브" },
    { href: "/admin/db", label: "DB 관리" },
  ],
};

export function AppChrome({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const pathname = usePathname();
  const chromeRef = useRef<HTMLDivElement>(null);
  const navCardRef = useRef<HTMLDivElement>(null);
  const minimalChrome = !session && pathname === "/";
  const wideLayout = pathname.startsWith("/admin/db");
  const showBoothProfile = session?.role === "BOOTH_MANAGER";

  const navItems = useMemo(() => {
    if (session) {
      if (session.role && ROLE_NAV[session.role]) {
        return ROLE_NAV[session.role] ?? DEFAULT_NAV;
      }
      return DEFAULT_NAV;
    }
    return [];
  }, [session]);

  useStaggeredReveal(chromeRef, pathname);

  useLayoutEffect(() => {
    const navCard = navCardRef.current;
    if (!navCard || navItems.length === 0) {
      navCard?.style.setProperty("--nav-highlight-opacity", "0");
      return;
    }

    const updateHighlight = () => {
      const activeLink = navCard.querySelector<HTMLAnchorElement>("[data-nav-active='true']");

      if (!activeLink) {
        navCard.style.setProperty("--nav-highlight-opacity", "0");
        navCard.style.setProperty("--nav-highlight-width", "0px");
        navCard.style.setProperty("--nav-highlight-x", "0px");
        return;
      }

      const { left: containerLeft } = navCard.getBoundingClientRect();
      const { left, width } = activeLink.getBoundingClientRect();
      const styles = window.getComputedStyle(navCard);
      const borderLeft = parseFloat(styles.borderLeftWidth) || 0;
      const containerWidth = navCard.clientWidth;
      const boundaryGap = 2; // keep horizontal gap consistent with vertical gap from CSS
      const center = left - (containerLeft + borderLeft) + width / 2;
      const innerWidth = Math.max(0, containerWidth - boundaryGap * 2);
      const clampedCenter = Math.min(Math.max(center - boundaryGap, 0), innerWidth);
      const stretch = 18;
      const baseWidth = Math.min(innerWidth, Math.max(width, 0) + stretch);
      const navIndex = Number(activeLink.getAttribute("data-nav-index") ?? "-1");
      const isFirst = navIndex === 0;
      const isLast = navIndex === navItems.length - 1;
      let desiredWidth = baseWidth;

      // Extend the highlight so its edges meet the inner boundary (leaving a uniform gap) when edge tabs are active.
      if (isFirst) {
        desiredWidth = Math.max(desiredWidth, Math.min(innerWidth, clampedCenter * 2));
      }

      if (isLast) {
        const distanceToRightEdge = innerWidth - clampedCenter;
        desiredWidth = Math.max(desiredWidth, Math.min(innerWidth, distanceToRightEdge * 2));
      }

      const highlightX = Math.max(0, Math.min(innerWidth - desiredWidth, clampedCenter - desiredWidth / 2));
      const translationX = highlightX + boundaryGap;

      navCard.style.setProperty("--nav-highlight-opacity", "1");
      navCard.style.setProperty("--nav-highlight-width", `${desiredWidth}px`);
      navCard.style.setProperty("--nav-highlight-x", `${translationX}px`);
    };

    const frame = requestAnimationFrame(updateHighlight);
    window.addEventListener("resize", updateHighlight);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateHighlight);
    };
  }, [pathname, navItems]);

  return (
    <div className={cn("app-shell", wideLayout && "app-shell--wide")} ref={chromeRef}>
      {showBoothProfile ? <BoothProfileButton /> : null}
      <div className={cn("app-shell__chrome", wideLayout && "app-shell__chrome--wide")}>
        <main
          id="main-content"
          className={cn("min-h-[60vh]", minimalChrome ? "p-0" : wideLayout ? "p-0" : "px-4 py-5")}
        >
          {children}
        </main>
      </div>

      {navItems.length > 0 ? (
        <nav className="pointer-events-none fixed bottom-4 left-0 right-0 flex justify-center px-4">
          <div
            ref={navCardRef}
            className="nav-tray pointer-events-auto glass-card frosted relative flex w-full max-w-md items-center justify-between gap-1 px-3 py-2"
          >
            <span className="nav-highlight" aria-hidden />
            {navItems.map((item, index) => {
              const active = matchesPath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-nav-active={active ? "true" : undefined}
                  data-nav-index={index}
                  className={cn(
                    "relative z-10 flex-1 rounded-[18px] px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide transition",
                    active
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}

    </div>
  );
}

function matchesPath(current: string, target: string) {
  if (current === target) {
    return true;
  }

  if (target === "/") {
    return current === "/";
  }

  return current.startsWith(`${target}/`);
}
