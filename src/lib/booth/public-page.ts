import { prisma } from "@/lib/prisma";
import { describeStudentId, formatStudentId } from "@/lib/students/student-id";

export type BoothPublicProfile = {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
};

export type BoothPublicRatingStats = {
  averageRating: number | null;
  ratingCount: number;
  reviewCount: number;
};

export type BoothReviewItem = {
  id: string;
  score: number;
  review: string;
  updatedAt: string;
  studentMaskedId: string;
  studentLabel: string;
};

export type BoothReviewPage = {
  items: BoothReviewItem[];
  nextCursor: string | null;
};

const DEFAULT_PAGE_SIZE = 10;

export async function fetchBoothPublicProfile(boothId: string): Promise<BoothPublicProfile | null> {
  return prisma.booth.findUnique({
    where: { id: boothId },
    select: {
      id: true,
      name: true,
      location: true,
      description: true,
    },
  });
}

export async function fetchBoothPublicRatingStats(boothId: string): Promise<BoothPublicRatingStats> {
  const [ratingAgg, reviewCount] = await prisma.$transaction([
    prisma.boothRating.aggregate({
      where: { boothId },
      _avg: { score: true },
      _count: { score: true },
    }),
    prisma.boothRating.count({
      where: {
        boothId,
        review: { not: null },
      },
    }),
  ]);

  const rawAverage = ratingAgg._avg.score;
  return {
    averageRating: rawAverage === null ? null : Number(rawAverage.toFixed(1)),
    ratingCount: ratingAgg._count.score,
    reviewCount,
  };
}

export async function fetchBoothReviewPage(params: {
  boothId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<BoothReviewPage> {
  const limit = clampPageSize(params.limit ?? DEFAULT_PAGE_SIZE);
  const records = await prisma.boothRating.findMany({
    where: {
      boothId: params.boothId,
      review: { not: null },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    ...(params.cursor
      ? {
          cursor: { id: params.cursor },
          skip: 1,
        }
      : {}),
    take: limit + 1,
    select: {
      id: true,
      score: true,
      review: true,
      updatedAt: true,
      student: {
        select: {
          grade: true,
          classNumber: true,
          studentNumber: true,
        },
      },
    },
  });

  const hasMore = records.length > limit;
  const slice = records.slice(0, limit);
  const nextCursor = hasMore ? slice[slice.length - 1]?.id ?? null : null;

  return {
    items: slice.flatMap((record) => {
      const review = record.review?.trim();
      if (!review) {
        return [];
      }

      const studentId = formatStudentId(record.student);
      const studentMaskedId = studentId ? `${studentId.slice(0, 3)}**` : "학번 미지정";

      return [
        {
          id: record.id,
          score: record.score,
          review,
          updatedAt: record.updatedAt.toISOString(),
          studentMaskedId,
          studentLabel: describeStudentId(record.student),
        },
      ] satisfies BoothReviewItem[];
    }),
    nextCursor,
  };
}

function clampPageSize(value: number) {
  const normalized = Number.isFinite(value) ? Math.trunc(value) : DEFAULT_PAGE_SIZE;
  return Math.min(30, Math.max(1, normalized));
}

