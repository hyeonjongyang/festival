import { prisma } from "@/lib/prisma";
import { BoothNotFoundError } from "@/lib/visits/errors";
import {
  BoothRatingConflictError,
  MissingVisitHistoryError,
} from "@/lib/ratings/errors";

export type BoothRatingRecord = {
  id: string;
  boothId: string;
  studentId: string;
  score: number;
  createdAt: string;
};

export type BoothRatingAggregate = {
  average: number;
  count: number;
};

export async function rateBooth(params: {
  boothId: string;
  studentId: string;
  score: number;
}): Promise<BoothRatingRecord> {
  const normalizedScore = normalizeScore(params.score);

  return prisma.$transaction(async (tx) => {
    const booth = await tx.booth.findUnique({
      where: { id: params.boothId },
      select: { id: true },
    });

    if (!booth) {
      throw new BoothNotFoundError();
    }

    const visitExists = await tx.boothVisit.findFirst({
      where: {
        boothId: params.boothId,
        studentId: params.studentId,
      },
      select: { id: true },
    });

    if (!visitExists) {
      throw new MissingVisitHistoryError();
    }

    const existingRating = await tx.boothRating.findUnique({
      where: {
        boothId_studentId: {
          boothId: params.boothId,
          studentId: params.studentId,
        },
      },
      select: { id: true },
    });

    if (existingRating) {
      throw new BoothRatingConflictError();
    }

    const rating = await tx.boothRating.create({
      data: {
        boothId: params.boothId,
        studentId: params.studentId,
        score: normalizedScore,
      },
      select: {
        id: true,
        boothId: true,
        studentId: true,
        score: true,
        createdAt: true,
      },
    });

    return {
      ...rating,
      createdAt: rating.createdAt.toISOString(),
    };
  });
}

export async function fetchBoothRatingStats(
  boothIds?: string[],
): Promise<Map<string, BoothRatingAggregate>> {
  if (boothIds && boothIds.length === 0) {
    return new Map();
  }

  const groups = await prisma.boothRating.groupBy({
    by: ["boothId"],
    ...(Array.isArray(boothIds)
      ? {
          where: {
            boothId: {
              in: boothIds,
            },
          },
        }
      : {}),
    _avg: {
      score: true,
    },
    _count: {
      score: true,
    },
  });

  return new Map(
    groups.map((group) => [
      group.boothId,
      {
        average: group._avg.score ?? 0,
        count: group._count.score,
      },
    ]),
  );
}

function normalizeScore(score: number) {
  const rounded = Math.round(score);

  if (rounded < 1 || rounded > 5) {
    throw new RangeError("평점은 1부터 5 사이여야 합니다.");
  }

  return rounded;
}
