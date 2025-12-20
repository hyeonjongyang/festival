import { prisma } from "@/lib/prisma";
import { fetchBoothRatingStats } from "@/lib/ratings";
import {
  TRENDING_MAX_ENTRIES,
  TRENDING_RATING_SMOOTHING_WEIGHT,
  TRENDING_RATING_WEIGHT,
  TRENDING_WINDOW_MINUTES,
} from "@/lib/config/constants";

const collator = new Intl.Collator("ko", {
  sensitivity: "base",
  usage: "sort",
});

export type TrendingBoothEntry = {
  id: string;
  rank: number;
  boothName: string;
  location: string | null;
  recentVisitCount: number;
  ratingAverage: number | null;
  ratingCount: number;
  ratingScope: "recent" | "all";
};

export type TrendingSource = "recent" | "history";

export type TrendingBoothResult = {
  generatedAt: string;
  windowMinutes: number;
  entries: TrendingBoothEntry[];
  source: TrendingSource;
};

export type TrendingBoothParams = {
  windowMinutes?: number;
  limit?: number;
  ratingWeight?: number;
  smoothingWeight?: number;
  now?: Date;
};

type TrendingBoothCandidate = TrendingBoothEntry & {
  score: number;
  totalVisitCount: number;
};

type VisitGroup = {
  boothId: string;
  _count: {
    _all: number;
  };
};

type RatingGroup = {
  boothId: string;
  _avg: {
    score: number | null;
  };
  _count: {
    score: number;
  };
};

export async function fetchTrendingBooths(
  params: TrendingBoothParams = {},
): Promise<TrendingBoothResult> {
  const now = params.now ?? new Date();
  const windowMinutes = clampPositiveInteger(
    params.windowMinutes ?? TRENDING_WINDOW_MINUTES,
  );
  const limit = clampPositiveInteger(
    params.limit ?? TRENDING_MAX_ENTRIES,
  );
  const ratingWeight = params.ratingWeight ?? TRENDING_RATING_WEIGHT;
  const smoothingWeight =
    params.smoothingWeight ?? TRENDING_RATING_SMOOTHING_WEIGHT;
  const cutoff = new Date(now.getTime() - windowMinutes * 60_000);

  const recentVisits = await prisma.boothVisit.groupBy({
    by: ["boothId"],
    where: {
      visitedAt: {
        gte: cutoff,
      },
    },
    _count: {
      _all: true,
    },
  });

  if (recentVisits.length === 0) {
    const historicalVisits = await prisma.boothVisit.groupBy({
      by: ["boothId"],
      _count: {
        _all: true,
      },
    });

    if (historicalVisits.length === 0) {
      return {
        generatedAt: now.toISOString(),
        windowMinutes,
        entries: [],
        source: "recent",
      };
    }

    return buildTrendingFromVisits({
      visitGroups: historicalVisits,
      now,
      windowMinutes,
      limit,
      ratingWeight,
      smoothingWeight,
      source: "history",
    });
  }

  return buildTrendingFromVisits({
    visitGroups: recentVisits,
    now,
    windowMinutes,
    limit,
    ratingWeight,
    smoothingWeight,
    cutoff,
    source: "recent",
  });
}

async function buildTrendingFromVisits({
  visitGroups,
  now,
  windowMinutes,
  limit,
  ratingWeight,
  smoothingWeight,
  cutoff,
  source,
}: {
  visitGroups: VisitGroup[];
  now: Date;
  windowMinutes: number;
  limit: number;
  ratingWeight: number;
  smoothingWeight: number;
  cutoff?: Date;
  source: TrendingSource;
}): Promise<TrendingBoothResult> {
  if (visitGroups.length === 0) {
    return {
      generatedAt: now.toISOString(),
      windowMinutes,
      entries: [],
      source,
    };
  }

  const boothIds = visitGroups.map((group) => group.boothId);
  const visitCounts = new Map(
    visitGroups.map((group) => [group.boothId, group._count._all]),
  );

  const [booths, recentRatings, globalRatings] = await Promise.all([
    prisma.booth.findMany({
      where: {
        id: {
          in: boothIds,
        },
      },
      select: {
        id: true,
        name: true,
        location: true,
        _count: {
          select: {
            visits: true,
          },
        },
      },
    }),
    cutoff
      ? prisma.boothRating.groupBy({
          by: ["boothId"],
          where: {
            boothId: {
              in: boothIds,
            },
            createdAt: {
              gte: cutoff,
            },
          },
          _avg: {
            score: true,
          },
          _count: {
            score: true,
          },
        })
      : Promise.resolve([] as RatingGroup[]),
    fetchBoothRatingStats(boothIds),
  ]);

  const recentRatingStats = new Map(
    recentRatings.map((group) => [
      group.boothId,
      {
        average: group._avg.score ?? 0,
        count: group._count.score,
      },
    ]),
  );

  const candidates = booths
    .map((booth) => {
      const recentVisitCount = visitCounts.get(booth.id) ?? 0;
      if (recentVisitCount === 0) {
        return null;
      }

      const recentRating = recentRatingStats.get(booth.id);
      const globalRating = globalRatings.get(booth.id);
      const globalAverage = globalRating?.average ?? 3;
      const globalCount = globalRating?.count ?? 0;
      const recentAverage = recentRating?.average ?? globalAverage;
      const recentCount = recentRating?.count ?? 0;
      const adjustedRecentAverage =
        recentCount > 0
          ? smoothAverage(
              recentAverage,
              recentCount,
              globalAverage,
              smoothingWeight,
            )
          : null;
      const ratingForScore =
        recentCount > 0 ? adjustedRecentAverage ?? globalAverage : globalAverage;
      const normalizedRating = normalizeRating(ratingForScore);
      const score =
        recentVisitCount * (1 + ratingWeight * normalizedRating);

      const ratingScope = recentCount > 0 ? "recent" : "all";
      const displayAverage =
        recentCount > 0
          ? adjustedRecentAverage
          : globalCount > 0
          ? globalRating?.average ?? null
          : null;
      const displayCount = recentCount > 0 ? recentCount : globalCount;

      return {
        id: booth.id,
        rank: 0,
        boothName: booth.name,
        location: booth.location ?? null,
        recentVisitCount,
        ratingAverage:
          displayAverage !== null ? roundToTenth(displayAverage) : null,
        ratingCount: displayCount,
        ratingScope,
        score,
        totalVisitCount: booth._count.visits,
      } satisfies TrendingBoothCandidate;
    })
    .filter((entry): entry is TrendingBoothCandidate => Boolean(entry));

  const sorted = candidates.sort((a, b) => {
    const scoreDelta = b.score - a.score;
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const visitDelta = b.recentVisitCount - a.recentVisitCount;
    if (visitDelta !== 0) {
      return visitDelta;
    }

    const totalDelta = b.totalVisitCount - a.totalVisitCount;
    if (totalDelta !== 0) {
      return totalDelta;
    }

    return collator.compare(a.boothName, b.boothName);
  });

  const entries = sorted.slice(0, limit).map((entry, index) => ({
    id: entry.id,
    rank: index + 1,
    boothName: entry.boothName,
    location: entry.location,
    recentVisitCount: entry.recentVisitCount,
    ratingAverage: entry.ratingAverage,
    ratingCount: entry.ratingCount,
    ratingScope: entry.ratingScope,
  }));

  return {
    generatedAt: now.toISOString(),
    windowMinutes,
    entries,
    source,
  };
}

function smoothAverage(
  recentAverage: number,
  recentCount: number,
  globalAverage: number,
  smoothingWeight: number,
) {
  const safeWeight = Math.max(0, smoothingWeight);
  return (
    (recentAverage * recentCount + globalAverage * safeWeight) /
    (recentCount + safeWeight)
  );
}

function normalizeRating(score: number) {
  const normalized = (score - 3) / 2;
  return clamp(normalized, -1, 1);
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampPositiveInteger(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  const integer = Math.floor(value);
  return integer <= 0 ? 1 : integer;
}
