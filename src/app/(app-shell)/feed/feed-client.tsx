"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionUser } from "@/components/session-provider";
import type { SessionUser } from "@/lib/auth/get-session-user";
import type { FeedPage, PostFeedItem } from "@/lib/posts/feed";

type Banner =
  | {
      variant: "error";
      message: string;
    }
  | null;

const timestampFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function FeedClient({ initialFeed }: { initialFeed: FeedPage }) {
  const [items, setItems] = useState<PostFeedItem[]>(initialFeed.items);
  const [nextCursor, setNextCursor] = useState(initialFeed.nextCursor);
  const [isFetching, setIsFetching] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [pendingHeartId, setPendingHeartId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const session = useSessionUser();
  const canHeart = session?.role === "STUDENT";

  const fetchMore = useCallback(async () => {
    if (!nextCursor || isFetching) {
      return;
    }

    setIsFetching(true);
    setBanner(null);

    try {
      const params = new URLSearchParams();
      params.set("cursor", nextCursor);
      const response = await fetch(`/api/posts?${params.toString()}`, {
        cache: "no-store",
      });

      const payload = (await parseJson(response)) as {
        feed?: {
          items?: PostFeedItem[];
          nextCursor?: string | null;
        };
      };
      const feed = payload.feed;

      if (!feed || !Array.isArray(feed.items)) {
        throw new Error("피드 응답 형식을 확인해주세요.");
      }

      const feedItems = feed.items as PostFeedItem[];
      const cursor =
        typeof feed.nextCursor === "string" || feed.nextCursor === null
          ? feed.nextCursor
          : null;

      setItems((prev) => [...prev, ...feedItems]);
      setNextCursor(cursor ?? null);
    } catch (error) {
      setBanner({
        variant: "error",
        message:
          error instanceof Error
            ? error.message
            : "피드를 더 불러오지 못했습니다.",
      });
    } finally {
      setIsFetching(false);
    }
  }, [nextCursor, isFetching]);

  useEffect(() => {
    if (!nextCursor) {
      return;
    }

    const target = sentinelRef.current;

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchMore();
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [nextCursor, fetchMore]);

  const handleHeartToggle = useCallback(
    async (postId: string) => {
      if (!canHeart || pendingHeartId) {
        return;
      }

      let snapshot: PostFeedItem | null = null;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== postId) {
            return item;
          }

          snapshot = item;
          const nextHearted = !item.viewerHasHeart;
          const delta = nextHearted ? 1 : -1;

          return {
            ...item,
            viewerHasHeart: nextHearted,
            heartCount: Math.max(0, item.heartCount + delta),
          };
        }),
      );

      if (!snapshot) {
        return;
      }

      const previous = snapshot;
      setPendingHeartId(postId);

      try {
        const response = await fetch(`/api/posts/${postId}/heart`, {
          method: "POST",
        });
        const payload = await parseJson(response);

        const hearted = payload.hearted;
        const totalHearts = payload.totalHearts;

        if (
          typeof hearted !== "boolean" ||
          typeof totalHearts !== "number"
        ) {
          throw new Error("하트 응답 형식을 확인해주세요.");
        }

        setItems((prev) =>
          prev.map((item) =>
            item.id === postId
              ? {
                  ...item,
                  viewerHasHeart: hearted,
                  heartCount: totalHearts,
                }
              : item,
          ),
        );
      } catch (error) {
        setItems((prev) =>
          prev.map((item) => (item.id === postId ? previous : item)),
        );
        setBanner({
          variant: "error",
          message:
            error instanceof Error
              ? error.message
              : "하트를 처리하지 못했습니다.",
        });
      } finally {
        setPendingHeartId(null);
      }
    },
    [canHeart, pendingHeartId],
  );

  const handleDelete = useCallback(
    async (postId: string) => {
      if (pendingDeleteId) {
        return;
      }

      setBanner(null);
      setPendingDeleteId(postId);

      try {
        const response = await fetch(`/api/posts/${postId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            payload && typeof payload.message === "string"
              ? payload.message
              : "게시글을 삭제하지 못했습니다.";
          throw new Error(message);
        }

        setItems((prev) => prev.filter((item) => item.id !== postId));
      } catch (error) {
        setBanner({
          variant: "error",
          message:
            error instanceof Error
              ? error.message
              : "게시글을 삭제하지 못했습니다.",
        });
      } finally {
        setPendingDeleteId(null);
      }
    },
    [pendingDeleteId, setBanner, setItems],
  );

  return (
    <section className="space-y-6" aria-busy={isFetching}>
      {banner ? <FeedBanner banner={banner} /> : null}

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <FeedList
            items={items}
            canHeart={canHeart}
            pendingHeartId={pendingHeartId}
            pendingDeleteId={pendingDeleteId}
            viewer={session}
            onHeartToggle={handleHeartToggle}
            onDelete={handleDelete}
          />

          {canHeart ? null : <HeartPermissionNotice />}
        </>
      )}

      {nextCursor ? (
        <LoadMoreButton
          isFetching={isFetching}
          onClick={() => void fetchMore()}
        />
      ) : (
        items.length > 0 && <EndOfFeedNotice />
      )}

      <div ref={sentinelRef} aria-hidden="true" />
    </section>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-3xl border border-border bg-surface px-6 py-10 text-center shadow-[var(--theme-shadow-soft)]"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold text-soft">피드 없음</p>
    </div>
  );
}

async function parseJson(
  response: Response,
): Promise<Record<string, unknown>> {
  let payload: Record<string, unknown> | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : "요청을 처리하지 못했습니다.",
    );
  }

  return payload ?? {};
}

function FeedBanner({ banner }: { banner: NonNullable<Banner> }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-100"
    >
      {banner.message}
    </div>
  );
}

function FeedList({
  items,
  canHeart,
  pendingHeartId,
  pendingDeleteId,
  viewer,
  onHeartToggle,
  onDelete,
}: {
  items: PostFeedItem[];
  canHeart: boolean;
  pendingHeartId: string | null;
  pendingDeleteId: string | null;
  viewer: SessionUser;
  onHeartToggle: (postId: string) => Promise<void>;
  onDelete: (postId: string) => Promise<void>;
}) {
  return (
    <ul className="flex flex-col gap-5">
      {items.map((item) => (
        <li key={item.id}>
          <FeedItem
            item={item}
            canHeart={canHeart}
            pendingHeartId={pendingHeartId}
            pendingDeleteId={pendingDeleteId}
            viewer={viewer}
            onHeartToggle={onHeartToggle}
            onDelete={onDelete}
          />
        </li>
      ))}
    </ul>
  );
}

function FeedItem({
  item,
  canHeart,
  pendingHeartId,
  pendingDeleteId,
  viewer,
  onHeartToggle,
  onDelete,
}: {
  item: PostFeedItem;
  canHeart: boolean;
  pendingHeartId: string | null;
  pendingDeleteId: string | null;
  viewer: SessionUser;
  onHeartToggle: (postId: string) => Promise<void>;
  onDelete: (postId: string) => Promise<void>;
}) {
  const createdAt = timestampFormatter.format(new Date(item.createdAt));
  const canDelete =
    viewer?.role === "ADMIN" || viewer?.id === item.authorId;
  const isDeleting = pendingDeleteId === item.id;
  const isHeartPending = pendingHeartId === item.id;
  const heartsLabel = item.viewerHasHeart
    ? `하트 취소, 총 ${item.heartCount.toLocaleString()}개`
    : `하트 남기기, 총 ${item.heartCount.toLocaleString()}개`;

  return (
    <article className="rounded-3xl border border-border bg-surface-alt px-5 py-6 shadow-[var(--theme-shadow-soft)] sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-soft">
            {item.boothName}
          </p>
          <h3 className="text-xl font-semibold text-foreground">
            {item.boothLocation ?? "위치 미정"}
          </h3>
        </div>
        <dl className="text-right text-xs text-muted">
          <div>
            <dt className="sr-only">게시 시각</dt>
            <dd>{createdAt}</dd>
          </div>
          <div>
            <dt className="sr-only">작성자</dt>
            <dd>{item.authorNickname}</dd>
          </div>
        </dl>
      </header>

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-soft sm:text-base">
        {item.body}
      </p>

      {item.imageUrl ? (
        <figure className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">
          <Image
            src={item.imageUrl}
            alt={`${item.boothName} 피드 이미지`}
            width={900}
            height={600}
            className="h-auto w-full object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority={false}
          />
        </figure>
      ) : null}

      <footer className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {canDelete ? (
          <button
            type="button"
            onClick={() => void onDelete(item.id)}
            disabled={isDeleting}
            aria-busy={isDeleting}
            className="inline-flex items-center gap-2 self-start rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-400/70 hover:text-rose-50 disabled:opacity-60"
          >
            삭제
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => void onHeartToggle(item.id)}
          disabled={!canHeart || isHeartPending}
          aria-pressed={item.viewerHasHeart}
          aria-label={heartsLabel}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            item.viewerHasHeart
              ? "border-transparent bg-primary text-foreground shadow-[0_0_0_1px_rgba(29,116,252,0.6)]"
              : "border-border bg-surface text-soft hover:border-primary/70 hover:text-foreground"
          } ${!canHeart ? "opacity-60" : ""} ${canDelete ? "sm:ml-auto" : ""}`}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            {item.viewerHasHeart ? "❤️" : "🤍"}
          </span>
          <span>{item.heartCount.toLocaleString()}</span>
        </button>
      </footer>
    </article>
  );
}

function HeartPermissionNotice() {
  return (
    <p className="rounded-3xl border border-dashed border-border bg-surface px-4 py-3 text-center text-xs text-muted">
      학생 계정 전용 기능입니다.
    </p>
  );
}

function LoadMoreButton({
  isFetching,
  onClick,
}: {
  isFetching: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isFetching}
      onClick={onClick}
      aria-busy={isFetching}
      className="w-full rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/70 hover:text-primary disabled:opacity-60"
    >
      {isFetching ? "불러오는 중" : "더 보기"}
    </button>
  );
}

function EndOfFeedNotice() {
  return (
    <p className="text-center text-sm text-muted">
      마지막입니다.
    </p>
  );
}
