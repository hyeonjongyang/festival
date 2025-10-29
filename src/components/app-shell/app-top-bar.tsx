"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSessionUser } from "@/components/session-provider";

type AppTopBarProps = {
  onProfileClick?: () => void;
};

type QuickAction = {
  href: string;
  label: string;
  description: string;
};

export function AppTopBar({ onProfileClick }: AppTopBarProps) {
  const sessionUser = useSessionUser();
  const initials = getUserInitial(sessionUser?.nickname);
  const quickActions = useMemo(
    () => getQuickActions(sessionUser?.role),
    [sessionUser?.role],
  );
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const actionRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const menuId = useId();
  const hasQuickActions = quickActions.length > 0;
  const isMenuOpen = hasQuickActions && isQuickMenuOpen;

  const closeQuickMenu = useCallback(() => {
    setIsQuickMenuOpen(false);
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    if (!hasQuickActions && isQuickMenuOpen) {
      // Defer closing to avoid synchronous state updates inside the effect.
      queueMicrotask(() => {
        closeQuickMenu();
      });
    }
  }, [closeQuickMenu, hasQuickActions, isQuickMenuOpen]);

  useEffect(() => {
    actionRefs.current = actionRefs.current.slice(0, quickActions.length);
  }, [quickActions.length]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }

      closeQuickMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [closeQuickMenu, isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const firstAction = actionRefs.current.find(
      (element): element is HTMLAnchorElement => element !== null,
    );
    firstAction?.focus();
  }, [isMenuOpen, quickActions.length]);

  const handleMenuKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeQuickMenu();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = actionRefs.current.filter(
        (element): element is HTMLAnchorElement => element !== null,
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    },
    [closeQuickMenu],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4">
        <Link
          href="/feed"
          className="text-xs font-semibold uppercase tracking-[0.3em] text-muted transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          FC
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {hasQuickActions ? (
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                aria-controls={isMenuOpen ? menuId : undefined}
                onClick={() => {
                  setIsQuickMenuOpen((open) => !open);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="역할 전용 빠른 액션 열기"
              >
                <LightningIcon />
              </button>
              {isMenuOpen ? (
                <div
                  ref={menuRef}
                  id={menuId}
                  role="menu"
                  aria-label="역할 전용 빠른 액션"
                  tabIndex={-1}
                  onKeyDown={handleMenuKeyDown}
                  className="absolute right-0 top-12 w-60 rounded-2xl border border-border bg-surface p-3 shadow-lg focus:outline-none"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                    빠른 액션
                  </p>
                  <ul className="mt-2 space-y-1">
                    {quickActions.map((action, index) => (
                      <li key={action.href}>
                        <Link
                          ref={(element) => {
                            actionRefs.current[index] = element;
                          }}
                          href={action.href}
                          role="menuitem"
                          onClick={() => {
                            closeQuickMenu();
                          }}
                          className="block rounded-xl border border-transparent px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <span className="block font-semibold">
                            {action.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {action.description}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onProfileClick}
            aria-label="프로필 열기"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {initials ? <span aria-hidden>{initials}</span> : <ProfileIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}

function getUserInitial(nickname: string | null | undefined) {
  if (!nickname || nickname.length === 0) {
    return null;
  }

  return nickname[0]?.toUpperCase();
}

function getQuickActions(role: string | null | undefined): QuickAction[] {
  if (role === "BOOTH_MANAGER") {
    return [
      {
        href: "/booth/points",
        label: "포인트 지급",
        description: "QR 스캔 기록과 학생별 적립 현황을 확인하세요.",
      },
      {
        href: "/booth/feed/new",
        label: "피드 게시",
        description: "부스 홍보용 게시글을 업로드합니다.",
      },
    ];
  }

  if (role === "ADMIN") {
    return [
      {
        href: "/admin/dashboard",
        label: "운영 대시보드",
        description: "실시간 지급 로그와 위험 경고를 모니터링합니다.",
      },
      {
        href: "/admin/accounts",
        label: "계정 발급 센터",
        description: "학생·부스·관리자 계정을 즉시 생성합니다.",
      },
    ];
  }

  return [];
}

function ProfileIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="8" r="3.2" />
      <path d="M6.8 19a5.2 5.2 0 0 1 10.4 0" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 stroke-current"
      fill="none"
      strokeWidth={1.8}
    >
      <path d="M11 3 6 13h5l-1 8 7-12h-5l1-6Z" strokeLinejoin="round" />
    </svg>
  );
}
