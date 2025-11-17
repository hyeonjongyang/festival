import { VisitViolationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DuplicateVisitError,
  BoothNotFoundError,
} from "@/lib/visits/errors";
import {
  boothVisitLogSelect,
  mapBoothVisitLog,
  type BoothVisitLogItem,
} from "@/lib/visits/logs";

export type RecordVisitParams = {
  studentId: string;
  boothToken: string;
};

export type BoothRatingStatus = {
  boothId: string;
  hasRated: boolean;
  score: number | null;
};

export type RecordVisitResult = {
  visit: BoothVisitLogItem;
  totalVisitCount: number;
  ratingStatus: BoothRatingStatus;
};

export async function recordVisitWithQrToken(
  params: RecordVisitParams,
): Promise<RecordVisitResult> {
  const boothToken = sanitizeToken(params.boothToken);

  if (!boothToken) {
    throw new BoothNotFoundError();
  }

  return prisma.$transaction(async (tx) => {
    const booth = await tx.booth.findUnique({
      where: { qrToken: boothToken },
      select: {
        id: true,
      },
    });

    if (!booth) {
      throw new BoothNotFoundError();
    }

    const duplicateVisit = await tx.boothVisit.findFirst({
      where: {
        boothId: booth.id,
        studentId: params.studentId,
      },
      orderBy: { visitedAt: "desc" },
      select: {
        visitedAt: true,
      },
    });

    if (duplicateVisit) {
      await tx.visitViolation.create({
        data: {
          boothId: booth.id,
          studentId: params.studentId,
          type: VisitViolationType.DUPLICATE_VISIT,
          lastVisitedAt: duplicateVisit.visitedAt,
          availableAt: duplicateVisit.visitedAt,
        },
      });

      throw new DuplicateVisitError(duplicateVisit.visitedAt);
    }

    const visitRecord = await tx.boothVisit.create({
      data: {
        boothId: booth.id,
        studentId: params.studentId,
      },
      select: boothVisitLogSelect,
    });

    const existingRating = await tx.boothRating.findUnique({
      where: {
        boothId_studentId: {
          boothId: booth.id,
          studentId: params.studentId,
        },
      },
      select: {
        score: true,
      },
    });

    const student = await tx.user.update({
      where: { id: params.studentId },
      data: {
        visitCount: { increment: 1 },
      },
      select: {
        visitCount: true,
      },
    });

    return {
      visit: mapBoothVisitLog(visitRecord),
      totalVisitCount: student.visitCount,
      ratingStatus: {
        boothId: booth.id,
        hasRated: Boolean(existingRating),
        score: existingRating?.score ?? null,
      },
    };
  });
}

function sanitizeToken(token: string) {
  if (typeof token !== "string") {
    return "";
  }

  return token.trim();
}
