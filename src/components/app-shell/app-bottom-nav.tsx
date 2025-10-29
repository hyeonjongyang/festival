"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionUser } from "@/components/session-provider";

type NavItem = {
  href: string;
  label: string;
  Icon: () => ReactElement;
};

const FEED_NAV: NavItem = {
  href: "/feed",
  label: "피드",
  Icon: FeedIcon,
};

const LEADERBOARD_NAV: NavItem = {
  href: "/leaderboard",
  label: "순위",
  Icon: TrophyIcon,
};

const STUDENT_MY_PAGE_NAV: NavItem = {
  href: "/student",
  label: "마이페이지",
  Icon: UserIcon,
};

const BOOTH_POINTS_NAV: NavItem = {
  href: "/booth/points",
  label: "포인트",
  Icon: PointsIcon,
};

const BOOTH_FEED_NAV: NavItem = {
  href: "/booth/feed/new",
  label: "게시",
  Icon: ComposeIcon,
};

const ADMIN_DASHBOARD_NAV: NavItem = {
  href: "/admin/dashboard",
  label: "대시보드",
  Icon: DashboardIcon,
};

const ADMIN_ACCOUNTS_NAV: NavItem = {
  href: "/admin/accounts",
  label: "계정 발급",
  Icon: AccountsIcon,
};

export function AppBottomNav() {
  const pathname = usePathname();
  const sessionUser = useSessionUser();
  const navItems = getNavItems(sessionUser?.role);

  return (
    <nav
      className="sticky bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur"
      aria-label="주요 탐색"
    >
      <div className="mx-auto flex w-full max-w-3xl items-stretch px-2 py-1">
        {navItems.map(({ href, label, Icon }) => {
          const active = isActivePath(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              data-active={active ? "true" : "false"}
              aria-current={active ? "page" : undefined}
              className="group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[active=true]:text-primary"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-transparent transition-colors group-data-[active=true]:border-primary/40 group-data-[active=true]:bg-primary/10">
                <Icon />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function getNavItems(role: string | null | undefined): NavItem[] {
  switch (role) {
    case "STUDENT":
      return [FEED_NAV, LEADERBOARD_NAV, STUDENT_MY_PAGE_NAV];
    case "BOOTH_MANAGER":
      return [FEED_NAV, BOOTH_POINTS_NAV, BOOTH_FEED_NAV];
    case "ADMIN":
      return [FEED_NAV, ADMIN_DASHBOARD_NAV, ADMIN_ACCOUNTS_NAV];
    default:
      return [FEED_NAV, LEADERBOARD_NAV];
  }
}

function isActivePath(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  const withTrailingSlash = href.endsWith("/") ? href : `${href}/`;
  return pathname.startsWith(withTrailingSlash);
}

function FeedIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 stroke-current"
      fill="none"
      strokeWidth={1.8}
    >
      <path d="M5 7.4c0-.78.63-1.4 1.4-1.4h11.2c.77 0 1.4.62 1.4 1.4v9.2c0 .77-.63 1.4-1.4 1.4H6.4A1.4 1.4 0 0 1 5 16.6z" />
      <path d="M9 12h6" strokeLinecap="round" />
      <path d="M9 9.5h6" strokeLinecap="round" />
      <path d="M9 14.5h3.5" strokeLinecap="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 stroke-current"
      fill="none"
      strokeWidth={1.8}
    >
      <path
        d="M8 6h8v1.8A4.2 4.2 0 0 1 11.8 12h-.6A4.2 4.2 0 0 1 8 7.8z"
        strokeLinejoin="round"
      />
      <path
        d="M16 6h2.2a1.8 1.8 0 0 1 0 3.6H16M8 6H5.8a1.8 1.8 0 1 0 0 3.6H8"
        strokeLinejoin="round"
      />
      <path d="M12 12v3.5" strokeLinecap="round" />
      <path d="M9 18h6" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 stroke-current"
      fill="none"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="8" r="3.2" />
      <path d="M6.5 18.2a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
    </svg>
  );
}

function PointsIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 stroke-current"
      fill="none"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="12" r="7.2" />
      <path d="M9.5 12H15" strokeLinecap="round" />
      <path d="M12 9v6" strokeLinecap="round" />
    </svg>
  );
}

function ComposeIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 stroke-current"
      fill="none"
      strokeWidth={1.8}
    >
      <path d="M5 17.5V19h1.5l9.4-9.4-1.5-1.5z" strokeLinejoin="round" />
      <path d="m18 8.5-2.1-2.1a1 1 0 0 0-1.4 0l-.9.9 3.5 3.5.9-.9a1 1 0 0 0 0-1.4Z" />
      <path d="M7.5 19H19" strokeLinecap="round" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 stroke-current"
      fill="none"
      strokeWidth={1.8}
    >
      <path d="M4.5 6.5h6v7h-6z" />
      <path d="M13.5 6.5H19v4h-5.5z" />
      <path d="M13.5 12.5H19V19h-5.5z" />
      <path d="M4.5 15.5h6V19h-6z" />
    </svg>
  );
}

function AccountsIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 stroke-current"
      fill="none"
      strokeWidth={1.8}
    >
      <rect x="4.5" y="5.5" width="15" height="13" rx="2" />
      <circle cx="12" cy="11" r="2.5" />
      <path d="M8.5 17c.6-1.5 2-2.5 3.5-2.5S15.4 15.5 16 17" strokeLinecap="round" />
    </svg>
  );
}
