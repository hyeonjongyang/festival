import { prisma } from "@/lib/prisma";
import { BOOTH_RECENT_LOG_LIMIT } from "@/lib/config/constants";
import { BoothAccessError } from "@/lib/points/errors";
import {
  boothPointLogSelect,
  mapBoothPointLogs,
  type BoothPointLogItem,
} from "@/lib/points/logs";

export type BoothSummary = {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  ownerNickname: string;
};

export type BoothPointsDashboard = {
  booth: BoothSummary;
  stats: {
    totalAwards: number;
    totalPoints: number;
  };
  recentLogs: BoothPointLogItem[];
};

export async function fetchBoothPointsDashboard(
  ownerId: string,
): Promise<BoothPointsDashboard> {
  const booth = await prisma.booth.findUnique({
    where: { ownerId },
    select: {
      id: true,
      name: true,
      location: true,
      description: true,
      owner: {
        select: {
          nickname: true,
        },
      },
    },
  });

  if (!booth) {
    throw new BoothAccessError();
  }

  const [recentLogs, aggregates] = await prisma.$transaction([
    prisma.pointLog.findMany({
      where: { boothId: booth.id },
      orderBy: { awardedAt: "desc" },
      take: BOOTH_RECENT_LOG_LIMIT,
      select: boothPointLogSelect,
    }),
    prisma.pointLog.aggregate({
      where: { boothId: booth.id },
      _count: { _all: true },
      _sum: { points: true },
    }),
  ]);

  return {
    booth: {
      id: booth.id,
      name: booth.name,
      location: booth.location,
      description: booth.description,
      ownerNickname: booth.owner.nickname,
    },
    stats: {
      totalAwards: aggregates._count?._all ?? 0,
      totalPoints: aggregates._sum?.points ?? 0,
    },
    recentLogs: mapBoothPointLogs(recentLogs),
  };
}
