"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";
import { useSessionUser } from "@/components/session-provider";
import type { StudentDashboardData } from "@/lib/students/dashboard";

type Banner =
  | {
      variant: "success" | "error";
      message: string;
    }
  | null;

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const sessionUser = useSessionUser();
  const isStudent = sessionUser?.role === "STUDENT";
  const [profile, setProfile] = useState<StudentDashboardData | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [nicknameValue, setNicknameValue] = useState("");
  const [nicknameMessage, setNicknameMessage] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isNicknamePending, setIsNicknamePending] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isQrRefreshing, setIsQrRefreshing] = useState(false);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const headingId = useId();

  useEffect(() => {
    const element = document.createElement("div");
    element.style.position = "relative";
    document.body.appendChild(element);
    setPortalElement(element);

    return () => {
      document.body.removeChild(element);
      setPortalElement(null);
    };
  }, []);

  const loadProfile = useCallback(async () => {
    if (!isStudent) {
      return;
    }

    setProfileLoading(true);
    setProfileError(null);
    setBanner(null);

    try {
      const payload = (await requestJson(
        "/api/students/me",
        { method: "GET", cache: "no-store" },
        "프로필 로드 실패",
      )) as { student?: StudentDashboardData };

      if (!payload.student) {
        throw new Error("응답 형식이 올바르지 않습니다.");
      }

      setProfile(payload.student);
      setNicknameValue(payload.student.nickname);
      setSuggestions([]);
      setNicknameMessage(null);
      setNicknameError(null);
    } catch {
      setProfileError("로드 실패");
    } finally {
      setProfileLoading(false);
    }
  }, [isStudent]);

  useEffect(() => {
    if (!open) {
      return;
    }

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    if (isStudent) {
      void loadProfile();
    }
  }, [open, isStudent, loadProfile]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;

    queueMicrotask(() => {
      const focusable = getFocusableElements(dialog);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        dialog?.focus();
      }
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const focusable = getFocusableElements(dialogRef.current);

        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const currentIndex = focusable.indexOf(
          document.activeElement as HTMLElement,
        );
        const lastIndex = focusable.length - 1;

        if (event.shiftKey) {
          if (currentIndex <= 0) {
            focusable[lastIndex].focus();
            event.preventDefault();
          }
        } else if (currentIndex === lastIndex) {
          focusable[0].focus();
          event.preventDefault();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;

      queueMicrotask(() => {
        restoreFocusRef.current?.focus();
      });
    };
  }, [open, onClose]);

  const handleNicknameSubmit = useCallback(
    async (lock?: boolean) => {
      if (!profile || profile.nicknameLocked) {
        return;
      }

      setIsNicknamePending(true);
      setNicknameMessage(null);
      setNicknameError(null);
      setBanner(null);

      try {
        const result = (await requestJson(
          "/api/students/nickname",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
          body: JSON.stringify({
            nickname: nicknameValue,
            lock,
          }),
        },
        "닉네임 저장 실패",
      )) as { nickname?: string; nicknameLocked?: boolean };

        if (!result.nickname) {
          throw new Error("응답 형식이 올바르지 않습니다.");
        }

        setProfile((prev) =>
          prev
            ? {
                ...prev,
                nickname: result.nickname ?? prev.nickname,
                nicknameLocked:
                  typeof result.nicknameLocked === "boolean"
                    ? result.nicknameLocked
                    : prev.nicknameLocked,
              }
            : prev,
        );

        setNicknameValue(result.nickname);
      setNicknameMessage(lock ? "확정 완료" : "저장 완료");

        if (lock) {
          setSuggestions([]);
        }
    } catch {
      setNicknameError("저장 실패");
      } finally {
        setIsNicknamePending(false);
      }
    },
    [nicknameValue, profile],
  );

  const handleSuggestion = useCallback(async () => {
    if (!profile || profile.nicknameLocked) {
      return;
    }

    setIsSuggestionLoading(true);
    setNicknameMessage(null);
    setNicknameError(null);
    setBanner(null);

    try {
      const payload = (await requestJson(
        "/api/students/nickname?count=3",
        { method: "GET", cache: "no-store" },
        "추천 실패",
      )) as { suggestions?: unknown };

      const nextSuggestions = Array.isArray(payload.suggestions)
        ? payload.suggestions.filter(
            (candidate): candidate is string =>
              typeof candidate === "string",
          )
        : [];

      setSuggestions(nextSuggestions);

      if (nextSuggestions[0]) {
        setNicknameValue(nextSuggestions[0]);
      }
    } catch {
      setNicknameError("추천 실패");
    } finally {
      setIsSuggestionLoading(false);
    }
  }, [profile]);

  const handleQrRefresh = useCallback(async () => {
    setIsQrRefreshing(true);
    setBanner(null);

    try {
      const payload = (await requestJson(
        "/api/students/qr",
        { method: "POST" },
        "QR 갱신 실패",
      )) as { qrToken?: string };

      if (!payload.qrToken) {
        throw new Error("응답 형식이 올바르지 않습니다.");
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              qrToken: payload.qrToken ?? prev.qrToken,
            }
          : prev,
      );

      setBanner({
        variant: "success",
        message: "갱신 완료",
      });
    } catch {
      setBanner({
        variant: "error",
        message: "갱신 실패",
      });
    } finally {
      setIsQrRefreshing(false);
    }
  }, []);

  const profileLabel = useMemo(
    () => (profile ? describeProfile(profile) : null),
    [profile],
  );

  if (!open || !portalElement) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className="relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-3xl border border-border bg-surface px-5 py-6 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id={headingId} className="text-xl font-semibold text-foreground">
              내 정보
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="프로필 닫기"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ExitIcon />
          </button>
        </header>

        {banner ? (
          <div
            role={banner.variant === "error" ? "alert" : "status"}
            aria-live={banner.variant === "error" ? "assertive" : "polite"}
            aria-atomic="true"
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              banner.variant === "success"
                ? "border-emerald-500/40 bg-emerald-400/10 text-emerald-200"
                : "border-rose-500/40 bg-rose-400/10 text-rose-100"
            }`}
          >
            {banner.message}
          </div>
        ) : null}

        <div className="mt-5 space-y-5">
          {!isStudent ? (
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-6 text-sm leading-relaxed text-muted">
              학생 전용입니다.
            </div>
          ) : profileLoading ? (
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-6 text-sm text-muted">
              불러오는 중
            </div>
          ) : profileError ? (
            <div className="space-y-4 rounded-2xl border border-border bg-background/70 px-4 py-6 text-sm text-muted">
              <p>{profileError}</p>
              <button
                type="button"
                onClick={() => void loadProfile()}
                className="inline-flex items-center justify-center rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                다시 시도
              </button>
            </div>
          ) : profile ? (
            <>
              <section className="space-y-3 rounded-2xl border border-border bg-background/70 px-4 py-5">
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-3xl font-semibold text-foreground">
                      {profile.points.toLocaleString()}점
                    </p>
                    {profileLabel ? (
                      <p className="mt-1 text-sm text-muted">{profileLabel}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadProfile()}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    새로고침
                  </button>
                </header>
              </section>

              <section className="space-y-4 rounded-2xl border border-border bg-background/70 px-4 py-5">
                <header>
                  <h3 className="text-lg font-semibold text-foreground">
                    QR 토큰
                  </h3>
                </header>
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:items-start">
                  <div className="rounded-3xl bg-white p-3 shadow-lg">
                    <QRCode
                      value={profile.qrToken}
                      size={160}
                      bgColor="#ffffff"
                      fgColor="#020817"
                      aria-hidden="true"
                      style={{ width: "160px", height: "160px" }}
                    />
                  </div>
                  <div className="flex w-full flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => void handleQrRefresh()}
                      disabled={isQrRefreshing}
                      aria-busy={isQrRefreshing}
                      className="inline-flex items-center justify-center rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {isQrRefreshing ? "새로고침 중" : "QR 새로고침"}
                    </button>
                    <p
                      className="font-mono text-xs text-muted"
                      aria-live="polite"
                    >
                      {profile.qrToken}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-border bg-background/70 px-4 py-5">
                <header>
                  <h3 className="text-lg font-semibold text-foreground">닉네임</h3>
                </header>

                <input
                  type="text"
                  value={nicknameValue}
                  disabled={profile.nicknameLocked}
                  onChange={(event) => setNicknameValue(event.target.value)}
                  maxLength={20}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                  placeholder="닉네임"
                />

                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => void handleNicknameSubmit(false)}
                    disabled={
                      profile.nicknameLocked ||
                      isNicknamePending ||
                      nicknameValue.trim().length === 0
                    }
                    aria-busy={isNicknamePending}
                    className="flex-1 min-w-[140px] rounded-2xl border border-primary/50 bg-primary/10 px-4 py-2 font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {isNicknamePending ? "저장 중" : "저장"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSuggestion()}
                    disabled={profile.nicknameLocked || isSuggestionLoading}
                    aria-busy={isSuggestionLoading}
                    className="min-w-[120px] rounded-2xl border border-border px-4 py-2 font-medium text-muted transition hover:text-foreground disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {isSuggestionLoading ? "추천 중" : "추천"}
                  </button>
                  {!profile.nicknameLocked ? (
                    <button
                      type="button"
                      onClick={() => void handleNicknameSubmit(true)}
                      disabled={
                        profile.nicknameLocked ||
                        isNicknamePending ||
                      nicknameValue.trim().length === 0
                    }
                    aria-busy={isNicknamePending}
                    className="min-w-[120px] rounded-2xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:text-foreground disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                      {isNicknamePending ? "확정 중" : "확정"}
                    </button>
                  ) : null}
                </div>

                {suggestions.length > 0 ? (
                  <div
                    className="flex flex-wrap gap-2 text-xs text-muted"
                    aria-live="polite"
                  >
                    {suggestions.map((candidate) => (
                      <button
                        key={candidate}
                        type="button"
                        onClick={() => setNicknameValue(candidate)}
                        className="rounded-full border border-border px-3 py-1 transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        {candidate}
                      </button>
                    ))}
                  </div>
                ) : null}

                {nicknameMessage ? (
                  <p
                    className="text-sm text-emerald-400"
                    role="status"
                    aria-live="polite"
                  >
                    {nicknameMessage}
                  </p>
                ) : null}

                {nicknameError ? (
                  <p
                    className="text-sm text-rose-400"
                    role="alert"
                    aria-live="assertive"
                  >
                    {nicknameError}
                  </p>
                ) : null}

                {profile.nicknameLocked ? (
                  <p className="text-sm text-muted">변경할 수 없습니다.</p>
                ) : null}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    portalElement,
  );
}

function describeProfile(student: StudentDashboardData) {
  const parts: string[] = [];

  if (typeof student.grade === "number") {
    parts.push(`${student.grade}학년`);
  }

  if (typeof student.classNumber === "number") {
    parts.push(`${student.classNumber}반`);
  }

  if (typeof student.studentNumber === "number") {
    parts.push(`${student.studentNumber}번`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) {
    return [];
  }

  const selector = [
    "a[href]",
    "area[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "iframe",
    "audio[controls]",
    "video[controls]",
    "[contenteditable='true']",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => !element.hasAttribute("data-focus-guard"),
  );
}

function ExitIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 stroke-current"
      strokeWidth={1.8}
      fill="none"
      strokeLinecap="round"
    >
      <path d="M6 6L18 18" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

async function requestJson(
  input: RequestInfo,
  init: RequestInit | undefined,
  fallbackMessage: string,
) {
  const response = await fetch(input, init);
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string"
        ? ((payload as { message: string }).message || fallbackMessage)
        : fallbackMessage;

    throw new Error(message);
  }

  return payload as Record<string, unknown>;
}
