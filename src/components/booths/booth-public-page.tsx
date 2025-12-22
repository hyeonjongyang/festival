"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { UserRole } from "@prisma/client";
import { jsonFetch } from "@/lib/client/http";
import { cn } from "@/lib/client/cn";
import { formatCompactDate, formatRelativeTime } from "@/lib/client/time";
import { StarGlyph, StarMeter } from "@/components/chrome/star-meter";
import { RatingModal } from "@/components/ratings/rating-modal";
import type {
  BoothPublicProfile,
  BoothPublicRatingStats,
  BoothReviewItem,
  BoothReviewPage,
} from "@/lib/booth/public-page";

type BoothPublicPageProps = {
  booth: BoothPublicProfile;
  stats: BoothPublicRatingStats;
  initialReviews: BoothReviewPage;
  viewer: { role: UserRole; id: string };
  my:
    | {
        visitedAt: string | null;
        rating: { score: number; review: string | null } | null;
        windowMs: number;
      }
    | null;
};

type ReviewsResponse = {
  page: BoothReviewPage;
};

export function BoothPublicPage({ booth, stats, initialReviews, viewer, my }: BoothPublicPageProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPortalReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const portalTarget = portalReady ? document.body : null;

  const [myRating, setMyRating] = useState(my?.rating ?? null);
  useEffect(() => {
    setMyRating(my?.rating ?? null);
  }, [my?.rating]);

  const [ratingModalOpen, setRatingModalOpen] = useState(false);

  const canInteract = useMemo(() => {
    if (!my?.visitedAt) return false;
    const visitedAtMs = Date.parse(my.visitedAt);
    if (!Number.isFinite(visitedAtMs)) return false;
    return now <= visitedAtMs + my.windowMs;
  }, [my?.visitedAt, my?.windowMs, now]);

  const [reviews, setReviews] = useState<BoothReviewItem[]>(initialReviews.items);
  const [nextCursor, setNextCursor] = useState<string | null>(initialReviews.nextCursor);
  const [morePending, setMorePending] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  const loadMore = async () => {
    if (!nextCursor || morePending) return;
    setMorePending(true);
    setMoreError(null);
    try {
      const payload = await jsonFetch<ReviewsResponse>(
        `/api/booths/${encodeURIComponent(booth.id)}/reviews?cursor=${encodeURIComponent(nextCursor)}`,
      );
      setReviews((prev) => [...prev, ...payload.page.items]);
      setNextCursor(payload.page.nextCursor);
    } catch {
      setMoreError("리뷰를 더 불러오지 못했습니다.");
    } finally {
      setMorePending(false);
    }
  };

  const modal =
    ratingModalOpen && portalTarget && my
      ? createPortal(
          <RatingModal
            boothId={booth.id}
            boothName={booth.name}
            mode={myRating ? "edit" : "create"}
            initialScore={myRating?.score ?? 0}
            initialReview={myRating?.review ?? null}
            visitedAt={my.visitedAt ?? undefined}
            dismissible
            onClose={() => setRatingModalOpen(false)}
            onComplete={(result) => {
              setMyRating({ score: result.score, review: result.review });
              setRatingModalOpen(false);
            }}
          />,
          portalTarget,
        )
      : null;

  return (
    <div className="space-y-6 pb-28">
      <header
        className="rounded-[36px] border border-[var(--outline)] bg-[var(--surface)] p-6 shadow-[var(--shadow-pop)]"
      >
        <h1 className="text-3xl font-semibold leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
          {booth.name}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {booth.location ? booth.location : "위치 미정"}
          {booth.description ? <span className="mx-2 opacity-40">/</span> : null}
          {booth.description ? booth.description : null}
        </p>

        <div className="mt-5 rounded-3xl border border-[var(--outline)] bg-[var(--surface-muted)] px-4 py-3">
          {stats.ratingCount > 0 && stats.averageRating !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="inline-flex" style={{ color: "var(--rating-star, #fadb4a)" }}>
                <StarGlyph size={16} />
              </span>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{stats.averageRating.toFixed(1)}</p>
              <p className="text-xs text-[var(--text-muted)]">{stats.ratingCount}명</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">평점 없음</p>
          )}
        </div>
      </header>

      {viewer.role === "STUDENT" ? (
        <section className="rounded-[32px] border border-[var(--outline)] bg-[var(--surface)] p-6 shadow-[var(--shadow-pop)]">
          <p className="font-semibold text-[var(--text-primary)]">내 평점 · 리뷰</p>

          {!my?.visitedAt ? (
            <p className="mt-3 rounded-2xl border border-[var(--outline)] px-4 py-3 text-sm text-[var(--text-muted)]">
              이 부스를 방문(스캔)하면 평점/리뷰를 남길 수 있어요.
            </p>
          ) : null}

          {my?.visitedAt ? (
            canInteract ? (
              <button
                type="button"
                className={cn(
                  "rating-editable group relative mt-3 flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                  "border-[var(--outline)] hover:border-[var(--outline-strong)]",
                )}
                onClick={() => setRatingModalOpen(true)}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--text-primary)]">
                    {myRating ? "탭해서 수정" : "탭해서 남기기"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                    {myRating?.review ? myRating.review : "리뷰 없음"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <StarMeter value={myRating?.score ?? null} size="sm" muted className="mb-1" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    {myRating?.score ? `${myRating.score}.0 / 5` : "미평가"}
                  </span>
                </div>
              </button>
            ) : (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--outline)] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--text-primary)]">
                    {myRating ? "내가 남긴 평점" : "미평가"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                    {myRating?.review ? myRating.review : "리뷰 없음"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <StarMeter value={myRating?.score ?? null} size="sm" muted className="mb-1" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    {myRating?.score ? `${myRating.score}.0 / 5` : "미평가"}
                  </span>
                </div>
              </div>
            )
          ) : null}
        </section>
      ) : null}

      <section className="rounded-[32px] border border-[var(--outline)] bg-[var(--surface)] p-6 shadow-[var(--shadow-pop)]">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
              부스 리뷰
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{stats.reviewCount.toLocaleString()}개</p>
          </div>
        </header>

        {reviews.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-[var(--outline)] px-4 py-3 text-sm text-[var(--text-muted)]">
            아직 공개된 리뷰가 없습니다. 첫 리뷰가 될 수 있어요.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="group rounded-[26px] border border-[var(--outline)] bg-[var(--surface-muted)] px-4 py-4 transition hover:border-[var(--outline-strong)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--outline)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                        <span style={{ color: "var(--rating-star, #fadb4a)" }}>
                          <StarGlyph size={14} />
                        </span>
                        {review.score}.0
                      </span>
                      <span
                        className="rounded-full border border-[var(--outline)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-muted)]"
                        title={review.studentLabel}
                      >
                        {review.studentMaskedId}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
                      {review.review}
                    </p>
                  </div>
                  <time
                    dateTime={review.updatedAt}
                    title={formatCompactDate(review.updatedAt)}
                    suppressHydrationWarning
                    className="shrink-0 pt-1 text-xs text-[var(--text-muted)]"
                  >
                    {formatRelativeTime(review.updatedAt, now)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}

        {moreError ? (
          <p className="mt-4 rounded-2xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">
            {moreError}
          </p>
        ) : null}

        <div className="mt-5 flex justify-center">
          {nextCursor ? (
            <button
              type="button"
              onClick={loadMore}
              disabled={morePending}
              className="rounded-3xl border border-[var(--outline)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--outline-strong)] disabled:opacity-60"
            >
              {morePending ? "불러오는 중…" : "더보기"}
            </button>
          ) : reviews.length > 0 ? (
            <p className="text-xs text-[var(--text-muted)]">마지막 리뷰까지 확인했어요.</p>
          ) : null}
        </div>
      </section>

      {modal}
    </div>
  );
}
