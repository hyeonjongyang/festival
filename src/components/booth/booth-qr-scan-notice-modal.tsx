"use client";

import { useEffect, useId } from "react";

type BoothQrScanNoticeModalProps = {
  message: string;
  onClose: () => void;
  onLogout: () => void;
  loggingOut?: boolean;
  error?: string | null;
};

export function BoothQrScanNoticeModal({
  message,
  onClose,
  onLogout,
  loggingOut = false,
  error = null,
}: BoothQrScanNoticeModalProps) {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4"
      data-reveal="skip"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button type="button" aria-label="모달 닫기" className="absolute inset-0" onClick={onClose} />

      <div className="glass-card frosted relative w-full max-w-md overflow-hidden rounded-[36px] border border-[var(--outline-strong)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3
                id={titleId}
                className="text-2xl font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                계정이 달라요
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-muted)] transition hover:border-[var(--outline-strong)] hover:text-[var(--text-primary)]"
            >
              닫기
            </button>
          </div>

          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[var(--text-muted)]">{message}</p>

          {error ? (
            <p className="mt-4 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onClose}
              disabled={loggingOut}
              className="inline-flex w-full items-center justify-center rounded-full border border-[var(--outline)] bg-transparent px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--outline-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:flex-1"
            >
              계속 둘러보기
            </button>
            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              className="inline-flex w-full items-center justify-center rounded-full border border-[var(--outline)] bg-[var(--bg-secondary)] px-5 py-3 text-sm font-semibold text-[var(--danger)] shadow-[0_16px_40px_rgba(255,82,82,0.15)] transition hover:border-[color:rgba(255,82,82,0.45)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:flex-1"
            >
              {loggingOut ? "로그아웃 중…" : "로그아웃"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
