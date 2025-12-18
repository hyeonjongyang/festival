"use client";

import Image from "next/image";
import useSWRInfinite from "swr/infinite";
import type { UserRole } from "@prisma/client";
import { jsonFetch } from "@/lib/client/http";
import { cn } from "@/lib/client/cn";
import { formatCompactDate, formatRelativeTime } from "@/lib/client/time";
import type { FeedPage } from "@/types/api";
import { useEffect, useMemo, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import type { SVGProps } from "react";
import { StarGlyph } from "@/components/chrome/star-meter";
import { BoothPostComposer } from "@/components/booth/booth-post-composer";
import { VisitScannerController, type VisitScannerControllerRenderProps } from "@/components/scan/visit-scanner";

type FeedApiResponse = {
  feed: FeedPage;
};

type BoothSummary = {
  name: string;
  location: string | null;
  description: string | null;
};

type FeedPanelProps = {
  initialFeed: FeedPage;
  viewerRole: UserRole;
  viewerId: string;
  booth: BoothSummary | null;
};

type FeedPanelContentProps = FeedPanelProps & {
  scannerControls?: VisitScannerControllerRenderProps;
};

const PAGE_SIZE = 8;

export function FeedPanel(props: FeedPanelProps) {
  if (props.viewerRole === "STUDENT") {
    return (
      <VisitScannerController>
        {(scannerControls) => <FeedPanelContent {...props} scannerControls={scannerControls} />}
      </VisitScannerController>
    );
  }

  return <FeedPanelContent {...props} />;
}

function FeedPanelContent({ initialFeed, viewerRole, viewerId, booth, scannerControls }: FeedPanelContentProps) {
  const isAdmin = viewerRole === "ADMIN";
  const canCreatePost = viewerRole === "BOOTH_MANAGER";
  const isStudent = viewerRole === "STUDENT";
  const canScan = Boolean(isStudent && scannerControls);
  const deepLinkSubmitToken = scannerControls?.submitToken;
  const deepLinkLastTokenRef = useRef<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const composerHeadingId = useId();
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const frame = window.requestAnimationFrame(() => setPortalReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const portalTarget = portalReady ? document.body : null;

  useEffect(() => {
    if (!canScan || !deepLinkSubmitToken) return;
    let deepLinkValue: string | null = null;

    try {
      const url = new URL(window.location.href);
      deepLinkValue = url.searchParams.get("boothToken") ?? url.searchParams.get("token") ?? url.searchParams.get("t");
    } catch {
      deepLinkValue = null;
    }

    if (!deepLinkValue) return;
    const normalized = deepLinkValue.trim();
    if (!normalized) return;
    if (deepLinkLastTokenRef.current === normalized) return;
    deepLinkLastTokenRef.current = normalized;

    try {
      const url = new URL(window.location.href);
      ["boothToken", "token", "t"].forEach((key) => url.searchParams.delete(key));
      const search = url.searchParams.toString();
      window.history.replaceState({}, "", `${url.pathname}${search ? `?${search}` : ""}${url.hash}`);
    } catch {
      // ignore URL parsing failures
    }

    void deepLinkSubmitToken(normalized, { source: "qr" });
  }, [canScan, deepLinkSubmitToken]);

  const getKey = (index: number, previous: FeedApiResponse | null) => {
    if (previous && !previous.feed.nextCursor) {
      return null;
    }

    if (index === 0) {
      return `/api/posts?limit=${PAGE_SIZE}`;
    }

    const cursor = previous?.feed.nextCursor;
    if (!cursor) {
      return null;
    }

    const search = new URLSearchParams({ cursor, limit: String(PAGE_SIZE) });
    return `/api/posts?${search.toString()}`;
  };

  const { data, error, setSize, isLoading, isValidating, mutate } = useSWRInfinite<FeedApiResponse>(
    getKey,
    (url: string) => jsonFetch<FeedApiResponse>(url),
    {
      revalidateOnFocus: false,
      fallbackData: initialFeed ? [{ feed: initialFeed }] : undefined,
    },
  );

  const posts = useMemo(() => (data ? data.flatMap((page) => page.feed.items) : []), [data]);
  const nextCursor = data?.[data.length - 1]?.feed.nextCursor ?? null;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !nextCursor) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isValidating) {
          setSize((current) => current + 1);
        }
      },
      {
        rootMargin: "300px 0px",
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, isValidating, setSize]);

  useEffect(() => {
    if (!composerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setComposerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [composerOpen]);

  useEffect(() => {
    if (typeof document === "undefined" || !composerOpen) {
      return;
    }

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;

    // Prevent background scroll while the composer modal is open.
    const scrollbarWidth = typeof window !== "undefined" ? window.innerWidth - documentElement.clientWidth : 0;
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [composerOpen]);

  const removePost = async (postId: string) => {
    await mutate((pages) => {
      if (!pages) return pages;
      return pages
        .map((page) => ({
          ...page,
          feed: {
            ...page.feed,
            items: page.feed.items.filter((item) => item.id !== postId),
          },
        }))
        .filter((page) => page.feed.items.length > 0 || page.feed.nextCursor !== null);
    }, false);
  };

  const handleDelete = async (postId: string) => {
    try {
      await jsonFetch(`/api/posts/${postId}`, { method: "DELETE" });
      await removePost(postId);
      setBanner(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "게시글을 삭제하지 못했습니다.";
      setBanner(message);
    }
  };

  const openComposer = () => {
    if (!canCreatePost) return;
    setComposerOpen(true);
  };
  const closeComposer = () => setComposerOpen(false);

  const handleComposerSuccess = () => {
    setComposerOpen(false);
    setBanner(null);
    void mutate();
  };

  return (
    <>
      <section className="space-y-4">
        {banner ? (
          <p className="rounded-2xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">{banner}</p>
        ) : null}

        {canScan && scannerControls?.status ? (
          <p className={cn("rounded-2xl border px-4 py-3 text-sm", scannerControls?.bannerClass)}>
            {scannerControls.status.message}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">
            피드를 불러오지 못했습니다. 새로고침 해주세요.
          </p>
        ) : null}

        {posts.length === 0 && !isLoading ? (
          <div className="p-6 text-center text-sm text-[var(--text-muted)]">
            아직 등록된 피드가 없습니다. 첫 소식을 공유해보세요!
          </div>
        ) : null}

        {posts.length > 0 ? (
          <div className="divide-y divide-[var(--outline)] overflow-hidden rounded-[28px] border border-[var(--outline)] bg-[var(--surface-muted)]">
            {posts.map((post) => (
              <article key={post.id} className="p-5 sm:p-6">
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                      {post.boothLocation ?? "위치 미정"}
                    </p>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-heading)" }}>
                      {post.boothName}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {post.authorName} · {formatCompactDate(post.createdAt)} ({formatRelativeTime(post.createdAt)})
                    </p>
                    {post.boothRatingCount > 0 && post.boothRatingAverage !== null ? (
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--text-primary)]">
                        <span style={{ color: "var(--rating-star, #fadb4a)" }}>
                          <StarGlyph size={16} />
                        </span>
                        {post.boothRatingAverage.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  {(isAdmin || post.authorId === viewerId) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      className="rounded-full border border-[var(--outline)] px-3 py-1 text-xs text-[var(--text-muted)]"
                    >
                      삭제
                    </button>
                  )}
                </header>

                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[var(--text-primary)]">{post.body}</p>

                {post.imageUrl ? (
                  <div className="mt-4 overflow-hidden rounded-[20px] border border-[var(--outline)]">
                    <Image
                      src={post.imageUrl}
                      alt={`${post.boothName} 이미지`}
                      width={800}
                      height={600}
                      className="h-auto w-full object-cover"
                      sizes="(max-width: 480px) 100vw, 480px"
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        <div ref={loadMoreRef} aria-hidden className="h-10 w-full" />

        {isValidating && nextCursor ? (
          <p className="rounded-2xl border border-dashed border-[var(--outline)] px-4 py-3 text-center text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Feed 업데이트 중…
          </p>
        ) : null}
      </section>

      {canCreatePost && portalTarget
        ? createPortal(
            <>
              <button
                type="button"
                onClick={openComposer}
                data-reveal="skip"
                className={cn(
                  "fixed bottom-24 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_30px_80px_rgba(0,65,170,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_40px_100px_rgba(0,90,210,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] overflow-visible isolate",
                  composerOpen ? "pointer-events-none opacity-0" : "opacity-100",
                )}
                aria-label="게시글 등록"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-[-8px] rounded-full bg-gradient-to-tr from-[#003cbe]/55 via-[#007eff]/55 to-[#00c6ff]/55 blur-2xl"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-[#003cbe] via-[#007eff] to-[#00c6ff]"
                />
                <PenIcon className="relative h-8 w-8 drop-shadow-[0_3px_8px_rgba(5,12,30,0.55)]" />
              </button>

              {composerOpen ? (
                <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-[110px] sm:items-center sm:pb-12">
                  <button
                    type="button"
                    className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/85 backdrop-blur-sm transition-opacity"
                    aria-label="모달 닫기"
                    onClick={closeComposer}
                  />
                  <div className="relative z-10 w-full max-w-lg" role="dialog" aria-modal aria-labelledby={composerHeadingId}>
                    <div className="glass-card frosted relative overflow-hidden border border-[var(--outline-strong)]">
                      <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
                        <div>
                          <h2
                            id={composerHeadingId}
                            className="text-2xl font-semibold text-[var(--text-primary)]"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            새 게시글 등록
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={closeComposer}
                          className="rounded-full border border-white/15 p-2 text-[var(--text-muted)] transition hover:text-white"
                        >
                          <span className="sr-only">모달 닫기</span>
                          <CloseIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="px-5 py-6">
                        {booth ? (
                          <BoothPostComposer onPostCreated={handleComposerSuccess} />
                        ) : (
                          <p className="rounded-2xl border border-dashed border-[var(--outline)] px-5 py-6 text-sm leading-relaxed text-[var(--text-muted)]">
                            연결된 부스 정보를 찾을 수 없습니다. 관리자에게 부스 계정을 다시 확인해주세요.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </>,
            portalTarget,
          )
        : null}

      {canScan && portalTarget && scannerControls
        ? createPortal(
            <button
              type="button"
              onClick={scannerControls.openScanner}
              disabled={scannerControls.pending}
              data-reveal="skip"
              className={cn(
                "fixed bottom-24 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_30px_80px_rgba(0,65,170,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_40px_100px_rgba(0,90,210,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] overflow-visible isolate disabled:cursor-not-allowed disabled:opacity-75",
                scannerControls.isScannerOpen ? "pointer-events-none opacity-0" : "opacity-100",
              )}
              aria-label="QR 스캔 열기"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-[-8px] rounded-full bg-gradient-to-tr from-[#003cbe]/55 via-[#007eff]/55 to-[#00c6ff]/55 blur-2xl"
              />
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-[#003cbe] via-[#007eff] to-[#00c6ff]" />
              <QrIcon className="relative h-7 w-7 drop-shadow-[0_3px_8px_rgba(5,12,30,0.55)]" />
            </button>,
            portalTarget,
          )
        : null}
    </>
  );
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M5 5l10 10M15 5l-10 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PenIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 30.0684 29.5277" fill="none" {...props}>
      <path
        d="M22.041 4.28789L20.4382 5.89177L9.0381 5.89177C6.82131 5.89177 5.57131 7.14177 5.57131 9.35856L5.57131 20.9894C5.57131 23.216 6.82131 24.466 9.0381 24.466L20.669 24.466C22.8858 24.466 24.1358 23.216 24.1358 20.9894L24.1358 9.66867L25.7512 8.05092C25.8276 8.4579 25.8643 8.89852 25.8643 9.36833L25.8643 20.9894C25.8643 24.3293 24.0088 26.1945 20.669 26.1945L9.0381 26.1945C5.69826 26.1945 3.84279 24.3293 3.84279 20.9894L3.84279 9.36833C3.84279 6.02848 5.69826 4.16325 9.0381 4.16325L20.669 4.16325C21.1602 4.16325 21.6193 4.2036 22.041 4.28789Z"
        fill="currentColor"
        fillOpacity={0.9}
      />
      <path
        d="M12.4463 17.9133L14.7119 16.9074L26.46 5.15934L24.9072 3.61638L13.169 15.3644L12.1045 17.5617C12.0069 17.7472 12.2412 18.0011 12.4463 17.9133ZM27.3487 4.2902L28.1983 3.4113C28.6084 2.99138 28.6182 2.45427 28.2178 2.05388L27.9737 1.80973C27.6026 1.43864 27.0459 1.48747 26.6553 1.87809L25.7959 2.7277Z"
        fill="currentColor"
        fillOpacity={0.9}
      />
    </svg>
  );
}

function QrIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 19.4824 19.1309" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g fill="currentColor" fillOpacity={0.85}>
        <path d="M0.78125 6.23047C1.29883 6.23047 1.57227 5.9375 1.57227 5.42969L1.57227 3.125C1.57227 2.10938 2.10938 1.5918 3.08594 1.5918L5.44922 1.5918C5.9668 1.5918 6.25 1.30859 6.25 0.800781C6.25 0.292969 5.9668 0.0195312 5.44922 0.0195312L3.06641 0.0195312C1.02539 0.0195312 0 1.02539 0 3.03711L0 5.42969C0 5.9375 0.283203 6.23047 0.78125 6.23047ZM18.3301 6.23047C18.8477 6.23047 19.1211 5.9375 19.1211 5.42969L19.1211 3.03711C19.1211 1.02539 18.0957 0.0195312 16.0547 0.0195312L13.6621 0.0195312C13.1543 0.0195312 12.8711 0.292969 12.8711 0.800781C12.8711 1.30859 13.1543 1.5918 13.6621 1.5918L16.0254 1.5918C16.9922 1.5918 17.5488 2.10938 17.5488 3.125L17.5488 5.42969C17.5488 5.9375 17.832 6.23047 18.3301 6.23047ZM3.06641 19.1309L5.44922 19.1309C5.9668 19.1309 6.25 18.8477 6.25 18.3496C6.25 17.8418 5.9668 17.5586 5.44922 17.5586L3.08594 17.5586C2.10938 17.5586 1.57227 17.041 1.57227 16.0254L1.57227 13.7207C1.57227 13.2031 1.28906 12.9199 0.78125 12.9199C0.273438 12.9199 0 13.2031 0 13.7207L0 16.1035C0 18.125 1.02539 19.1309 3.06641 19.1309ZM13.6621 19.1309L16.0547 19.1309C18.0957 19.1309 19.1211 18.1152 19.1211 16.1035L19.1211 13.7207C19.1211 13.2031 18.8379 12.9199 18.3301 12.9199C17.8223 12.9199 17.5488 13.2031 17.5488 13.7207L17.5488 16.0254C17.5488 17.041 16.9922 17.5586 16.0254 17.5586L13.6621 17.5586C13.1543 17.5586 12.8711 17.8418 12.8711 18.3496C12.8711 18.8477 13.1543 19.1309 13.6621 19.1309Z" />
        <path d="M5.30273 14.2383L8.70117 14.2383C8.94531 14.2383 9.13086 14.0527 9.13086 13.8086L9.13086 10.4102C9.13086 10.1758 8.94531 9.98047 8.70117 9.98047L5.30273 9.98047C5.05859 9.98047 4.87305 10.1758 4.87305 10.4102L4.87305 13.8086C4.87305 14.0527 5.05859 14.2383 5.30273 14.2383ZM5.72266 13.3887L5.72266 10.8301L8.28125 10.8301L8.28125 13.3887ZM6.46484 12.6465L7.53906 12.6465L7.53906 11.5723L6.46484 11.5723ZM5.30273 9.14062L8.70117 9.14062C8.94531 9.14062 9.13086 8.95508 9.13086 8.71094L9.13086 5.3125C9.13086 5.06836 8.94531 4.88281 8.70117 4.88281L5.30273 4.88281C5.05859 4.88281 4.87305 5.06836 4.87305 5.3125L4.87305 8.71094C4.87305 8.95508 5.05859 9.14062 5.30273 9.14062ZM5.72266 8.29102L5.72266 5.72266L8.28125 5.72266L8.28125 8.29102ZM6.46484 7.53906L7.53906 7.53906L7.53906 6.47461L6.46484 6.47461ZM10.4004 9.14062L13.7988 9.14062C14.043 9.14062 14.2285 8.95508 14.2285 8.71094L14.2285 5.3125C14.2285 5.06836 14.043 4.88281 13.7988 4.88281L10.4004 4.88281C10.1562 4.88281 9.9707 5.06836 9.9707 5.3125L9.9707 8.71094C9.9707 8.95508 10.1562 9.14062 10.4004 9.14062ZM10.8203 8.29102L10.8203 5.72266L13.3789 5.72266L13.3789 8.29102ZM11.5723 7.53906L12.6367 7.53906L12.6367 6.47461L11.5723 6.47461ZM10.0977 14.1113L11.1621 14.1113L11.1621 13.0469L10.0977 13.0469ZM13.0371 14.1113L14.1016 14.1113L14.1016 13.0469L13.0371 13.0469ZM11.5625 12.6465L12.6367 12.6465L12.6367 11.5723L11.5625 11.5723ZM10.0977 11.1719L11.1621 11.1719L11.1621 10.1074L10.0977 10.1074ZM13.0371 11.1719L14.1016 11.1719L14.1016 10.1074L13.0371 10.1074Z" />
      </g>
    </svg>
  );
}
