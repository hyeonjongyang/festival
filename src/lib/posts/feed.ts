import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  FEED_PAGE_DEFAULT_SIZE,
  FEED_PAGE_MAX_SIZE,
} from "@/lib/config/constants";

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
      nickname: true,
    },
  },
  _count: {
    select: {
      hearts: true,
    },
  },
} satisfies Prisma.PostInclude;

export type PostFeedItem = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  authorId: string;
  boothName: string;
  boothLocation: string | null;
  authorNickname: string;
  heartCount: number;
  viewerHasHeart: boolean;
};

export type FeedPage = {
  items: PostFeedItem[];
  nextCursor: string | null;
};

export type FeedPageParams = {
  viewerId?: string | null;
  limit?: number;
  cursor?: string | null;
};

type FeedPostRecord = Prisma.PostGetPayload<{
  include: typeof baseFeedInclude & {
    hearts?: {
      select: {
        id: true;
      };
      where: {
        userId: string;
      };
    };
  };
}>;

export async function fetchFeedPage(params: FeedPageParams = {}): Promise<FeedPage> {
  const limit = clampPageSize(params.limit);
  const include: Prisma.PostInclude = { ...baseFeedInclude };

  if (params.viewerId) {
    include.hearts = {
      select: {
        id: true,
      },
      where: {
        userId: params.viewerId,
      },
    };
  }

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
    include,
  })) as FeedPostRecord[];

  const hasMore = posts.length > limit;
  const visible = hasMore ? posts.slice(0, limit) : posts;

  return {
    items: visible.map((record) => mapFeedRecord(record)),
    nextCursor: hasMore
      ? visible[visible.length - 1]?.id ?? null
      : null,
  };
}

export function mapFeedRecord(record: FeedPostRecord): PostFeedItem {
  return {
    id: record.id,
    body: record.body,
    imageUrl: toPublicImageUrl(record.imagePath),
    createdAt: record.createdAt.toISOString(),
    authorId: record.author.id,
    boothName: formatBoothName(record.booth?.name),
    boothLocation: record.booth?.location ?? null,
    authorNickname: record.author.nickname,
    heartCount: record._count?.hearts ?? 0,
    viewerHasHeart: Boolean(record.hearts?.length),
  };
}

export function toPublicImageUrl(pathValue: string | null | undefined) {
  if (!pathValue) {
    return null;
  }

  return pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
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
