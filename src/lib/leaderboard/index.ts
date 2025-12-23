import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  fetchBoothRatingStats,
  type BoothRatingAggregate,
} from "@/lib/ratings";

const collator = new Intl.Collator("ko", {
  sensitivity: "base",
  usage: "sort",
});

const boothLeaderboardSelect = {
  id: true,
  name: true,
  location: true,
  owner: {
    select: {
      nickname: true,
    },
  },
  _count: {
    select: {
      visits: true,
    },
  },
} as const satisfies Prisma.BoothSelect;

export type BoothLeaderboardRecord = Prisma.BoothGetPayload<{
  select: typeof boothLeaderboardSelect;
}>;

export type BoothLeaderboardEntry = {
  id: string;
  rank: number;
  boothName: string;
  totalVisits: number;
  location: string | null;
  ownerNickname: string;
  averageRating: number | null;
  ratingCount: number;
};

export type BoothLeaderboardResult = {
  generatedAt: string;
  totalBooths: number;
  entries: BoothLeaderboardEntry[];
};

export function sortBoothLeaderboardRecords(
  records: BoothLeaderboardRecord[],
  ratingStats?: Map<string, BoothRatingAggregate>,
) {
  return [...records].sort((a, b) => {
    const visitDelta = (b._count?.visits ?? 0) - (a._count?.visits ?? 0);

    if (visitDelta !== 0) {
      return visitDelta;
    }

    const aRating = ratingStats?.get(a.id)?.average ?? -1;
    const bRating = ratingStats?.get(b.id)?.average ?? -1;
    const ratingDelta = bRating - aRating;

    if (ratingDelta !== 0) {
      return ratingDelta;
    }

    return collator.compare(a.name, b.name);
  });
}

export function rankBoothLeaderboardRecords(
  records: BoothLeaderboardRecord[],
  ratingStats?: Map<string, BoothRatingAggregate>,
): BoothLeaderboardEntry[] {
  const sorted = sortBoothLeaderboardRecords(records, ratingStats);

  let currentRank = 0;
  let previousVisitCount: number | null = null;

  return sorted.map((record) => {
    const visitCount = record._count?.visits ?? 0;

    if (previousVisitCount === null || visitCount !== previousVisitCount) {
      currentRank += 1;
      previousVisitCount = visitCount;
    }

    const stats = ratingStats?.get(record.id);

    return {
      id: record.id,
      rank: currentRank,
      boothName: record.name,
      totalVisits: visitCount,
      location: record.location ?? null,
      ownerNickname: record.owner.nickname,
      averageRating: stats ? Number(stats.average.toFixed(1)) : null,
      ratingCount: stats?.count ?? 0,
    };
  });
}

export async function fetchBoothLeaderboard(): Promise<BoothLeaderboardResult> {
  const records = await prisma.booth.findMany({
    select: boothLeaderboardSelect,
    orderBy: [
      { visits: { _count: "desc" } },
      { name: "asc" },
    ],
  });

  const ratingStats = await fetchBoothRatingStats(records.map((record) => record.id));

  const entries = rankBoothLeaderboardRecords(records, ratingStats);

  return {
    generatedAt: new Date().toISOString(),
    totalBooths: entries.length,
    entries,
  };
}
