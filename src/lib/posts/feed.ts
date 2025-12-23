import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserDisplayName } from "@/lib/users/display-name";
import {
  FEED_PAGE_DEFAULT_SIZE,
  FEED_PAGE_MAX_SIZE,
} from "@/lib/config/constants";
import { fetchBoothRatingStats } from "@/lib/ratings";

const baseFeedInclude = {
  booth: {
    select: {
      id: true,
      name: true,
      location: true,
    },
  },
  author: {
    select: {
      id: true,
      role: true,
      nickname: true,
      grade: true,
      classNumber: true,
      studentNumber: true,
    },
  },
} satisfies Prisma.PostInclude;

export type PostFeedItem = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  authorId: string;
  boothId: string | null;
  boothName: string;
  boothLocation: string | null;
  authorName: string;
  boothRatingAverage: number | null;
  boothRatingCount: number;
};

export type FeedPage = {
  items: PostFeedItem[];
  nextCursor: string | null;
};

export type FeedPageParams = {
  limit?: number;
  cursor?: string | null;
};

type FeedPostRecord = Prisma.PostGetPayload<{
  include: typeof baseFeedInclude;
}>;

export async function fetchFeedPage(params: FeedPageParams = {}): Promise<FeedPage> {
  const limit = clampPageSize(params.limit);
  const posts = (await prisma.post.findMany({
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit + 1,
    ...(params.cursor
      ? {
          cursor: { id: params.cursor },
          skip: 1,
        }
      : {}),
    include: baseFeedInclude,
  })) as FeedPostRecord[];

  const hasMore = posts.length > limit;
  const visible = hasMore ? posts.slice(0, limit) : posts;
  const boothIds = Array.from(
    new Set(
      visible
        .map((record) => record.booth?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const boothRatings = await fetchBoothRatingStats(boothIds);

  return {
    items: visible.map((record) => mapFeedRecord(record, boothRatings)),
    nextCursor: hasMore
      ? visible[visible.length - 1]?.id ?? null
      : null,
  };
}

export function mapFeedRecord(
  record: FeedPostRecord,
  ratingStats?: Map<string, { average: number; count: number }>,
): PostFeedItem {
  const boothId = record.booth?.id ?? null;
  const stats = boothId ? ratingStats?.get(boothId) : undefined;

  return {
    id: record.id,
    body: record.body,
    imageUrl: toPublicImageUrl(record.imagePath),
    createdAt: record.createdAt.toISOString(),
    authorId: record.author.id,
    boothId,
    boothName: formatBoothName(record.booth?.name),
    boothLocation: record.booth?.location ?? null,
    authorName: getUserDisplayName(record.author),
    boothRatingAverage: stats ? Number(stats.average.toFixed(1)) : null,
    boothRatingCount: stats?.count ?? 0,
  };
}

export function toPublicImageUrl(pathValue: string | null | undefined) {
  if (!pathValue) {
    return null;
  }

  const normalized = pathValue.startsWith("/") ? pathValue : `/${pathValue}`;

  if (normalized.startsWith("/api/uploads/")) {
    return normalized;
  }

  if (normalized.startsWith("/uploads/")) {
    return `/api/uploads/${normalized.slice("/uploads/".length)}`;
  }

  return normalized;
}

function clampPageSize(limit?: number | null) {
  if (!limit || Number.isNaN(limit)) {
    return FEED_PAGE_DEFAULT_SIZE;
  }

  const safeLimit = Math.floor(limit);

  if (safeLimit <= 0) {
    return FEED_PAGE_DEFAULT_SIZE;
  }

  return Math.min(safeLimit, FEED_PAGE_MAX_SIZE);
}

function formatBoothName(name: string | null | undefined) {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "이름 없는 부스";
}
