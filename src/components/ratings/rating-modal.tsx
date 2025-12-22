"use client";

import { useEffect, useState } from "react";
import { StarSelector } from "@/components/chrome/star-selector";
import { jsonFetch, HttpError } from "@/lib/client/http";
import { RATING_EDIT_WINDOW_MS } from "@/lib/ratings/policy";

export type RatingModalResult = {
  boothName: string;
  score: number;
  review: string | null;
};

type RatingModalProps = {
  boothId: string;
  boothName: string;
  mode?: "create" | "edit";
  initialScore?: number;
  initialReview?: string | null;
  visitedAt?: string;
  dismissible?: boolean;
  onComplete: (result: RatingModalResult) => void;
  onClose?: () => void;
};

export function RatingModal({
  boothId,
  boothName,
  mode = "create",
  initialScore = 0,
  initialReview = null,
  visitedAt,
  dismissible = false,
  onComplete,
  onClose,
}: RatingModalProps) {
  const [score, setScore] = useState(initialScore);
  const [review, setReview] = useState(initialReview ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setScore(initialScore);
    setReview(initialReview ?? "");
    setError(null);
  }, [boothId, initialScore, initialReview, mode]);

  const interactionLocked = (() => {
    if (!visitedAt) return false;
    const visitedAtMs = Date.parse(visitedAt);
    if (!Number.isFinite(visitedAtMs)) return false;
    return Date.now() > visitedAtMs + RATING_EDIT_WINDOW_MS;
  })();

  const submitRating = async () => {
    if (!score || pending || interactionLocked) return;

    setPending(true);
    setError(null);

    try {
      const payload = await jsonFetch<{ rating: { score: number; review: string | null } }>("/api/ratings", {
        method: mode === "edit" ? "PATCH" : "POST",
        body: JSON.stringify({ boothId, score, review }),
      });

      onComplete({ boothName, score: payload.rating.score, review: payload.rating.review ?? null });
    } catch (err) {
      if (err instanceof HttpError) {
        setError(err.message);
      } else {
        setError(mode === "edit" ? "평점을 수정하지 못했습니다. 다시 시도해주세요." : "평점을 저장하지 못했습니다. 다시 시도해주세요.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="rating-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      data-reveal="skip"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "edit" ? "평점 수정" : "평점 남기기"}
    >
      {dismissible ? (
        <button
          type="button"
          aria-label="모달 닫기"
          className="absolute inset-0"
          onClick={() => onClose?.()}
        />
      ) : null}

      <div className="rating-card glass-card frosted relative w-full max-w-md rounded-[36px] border border-[var(--outline-strong)] bg-[var(--surface)] p-6 text-center shadow-2xl">
        {dismissible ? (
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-muted)] transition hover:border-[var(--outline-strong)]"
            onClick={() => onClose?.()}
          >
            닫기
          </button>
        ) : null}

        <h3 className="mt-2 text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
          {boothName}
        </h3>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          방문 후 <span className="font-semibold text-[var(--text-primary)]">10분</span> 안에 평점/리뷰를 작성하고 수정할 수 있어요.
        </p>

        <div className="mt-6 flex flex-col items-center gap-4">
          <StarSelector
            value={score}
            onChange={(value) => {
              setScore(value);
              setError(null);
            }}
            disabled={pending || interactionLocked}
          />
          <div className="text-4xl font-semibold text-[var(--accent)]">{score > 0 ? `${score}.0` : "–"}</div>
        </div>

        <div className="mt-5 text-left">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-[-0.01em] text-[var(--text-muted)]">리뷰(선택)</p>
          </div>
          <textarea
            value={review}
            onChange={(event) => {
              setReview(event.target.value);
              setError(null);
            }}
            placeholder="좋았던 점을 짧게 남겨주세요."
            maxLength={300}
            rows={4}
            disabled={pending || interactionLocked}
            className="mt-2 w-full resize-none rounded-3xl border border-[var(--outline)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--outline-strong)] disabled:opacity-60"
          />
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="mt-5 w-full rounded-3xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-60"
          onClick={submitRating}
          disabled={!score || pending || interactionLocked}
        >
          {pending ? (mode === "edit" ? "수정 중…" : "저장 중…") : mode === "edit" ? "평점 수정하기" : "평점 남기기"}
        </button>
      </div>
    </div>
  );
}
