import { PointViolationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  POINT_AWARD_VALUE,
  POINT_AWARD_WINDOW_MINUTES,
} from "@/lib/config/constants";
import {
  DuplicateAwardError,
  StudentNotFoundError,
} from "@/lib/points/errors";
import {
  boothPointLogSelect,
  mapBoothPointLog,
  type BoothPointLogItem,
} from "@/lib/points/logs";

export type AwardPointsParams = {
  boothId: string;
  qrToken: string;
};

export function calculateThrottleExpiry(
  awardedAt: Date,
  windowMinutes = POINT_AWARD_WINDOW_MINUTES,
) {
  const minutes = Number.isFinite(windowMinutes)
    ? windowMinutes
    : POINT_AWARD_WINDOW_MINUTES;

  return new Date(awardedAt.getTime() + minutes * 60 * 1000);
}

export async function awardPointsWithQrToken(
  params: AwardPointsParams,
): Promise<BoothPointLogItem> {
  const qrToken = sanitizeQrToken(params.qrToken);

  if (!qrToken) {
    throw new StudentNotFoundError();
  }

  const windowStart = new Date(
    Date.now() - POINT_AWARD_WINDOW_MINUTES * 60 * 1000,
  );

  return prisma.$transaction(async (tx) => {
    const student = await tx.user.findUnique({
      where: { qrToken },
      select: {
        id: true,
        role: true,
      },
    });

    if (!student || student.role !== "STUDENT") {
      throw new StudentNotFoundError();
    }

    const duplicateLog = await tx.pointLog.findFirst({
      where: {
        boothId: params.boothId,
        studentId: student.id,
        awardedAt: {
          gte: windowStart,
        },
      },
      orderBy: { awardedAt: "desc" },
      select: {
        awardedAt: true,
      },
    });

    if (duplicateLog) {
      const availableAt = calculateThrottleExpiry(duplicateLog.awardedAt);

      await tx.pointViolation.create({
        data: {
          boothId: params.boothId,
          studentId: student.id,
          type: PointViolationType.DUPLICATE_AWARD,
          lastAwardedAt: duplicateLog.awardedAt,
          availableAt,
        },
      });

      throw new DuplicateAwardError(availableAt);
    }

    await tx.user.update({
      where: { id: student.id },
      data: {
        points: { increment: POINT_AWARD_VALUE },
      },
    });

    const pointLog = await tx.pointLog.create({
      data: {
        boothId: params.boothId,
        studentId: student.id,
        points: POINT_AWARD_VALUE,
      },
      select: boothPointLogSelect,
    });

    return mapBoothPointLog(pointLog);
  });
}

function sanitizeQrToken(token: string) {
  if (typeof token !== "string") {
    return "";
  }

  return token.trim();
}
