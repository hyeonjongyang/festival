import { prisma } from "@/lib/prisma";
import { BOOTH_RECENT_VISIT_LIMIT } from "@/lib/config/constants";
import { BoothAccessError } from "@/lib/visits/errors";
import {
  boothVisitLogSelect,
  mapBoothVisitLogs,
  type BoothVisitLogItem,
} from "@/lib/visits/logs";

export type BoothSummary = {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  ownerNickname: string;
  qrToken: string;
};

export type BoothVisitsDashboard = {
  booth: BoothSummary;
  stats: {
    totalVisits: number;
    uniqueVisitors: number;
  };
  recentLogs: BoothVisitLogItem[];
};

export async function fetchBoothVisitsDashboard(
  ownerId: string,
): Promise<BoothVisitsDashboard> {
  const booth = await prisma.booth.findUnique({
    where: { ownerId },
    select: {
      id: true,
      name: true,
      location: true,
      description: true,
      qrToken: true,
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

  const [recentLogs, totalVisits, uniqueVisitorGroups] = await prisma.$transaction([
    prisma.boothVisit.findMany({
      where: { boothId: booth.id },
      orderBy: { visitedAt: "desc" },
      take: BOOTH_RECENT_VISIT_LIMIT,
      select: boothVisitLogSelect,
    }),
    prisma.boothVisit.count({
      where: { boothId: booth.id },
    }),
    prisma.boothVisit.groupBy({
      where: { boothId: booth.id },
      by: ["studentId"],
      _count: {
        _all: true,
      },
    }),
  ]);
  const uniqueVisitors = uniqueVisitorGroups.length;

  return {
    booth: {
      id: booth.id,
      name: booth.name,
      location: booth.location,
      description: booth.description,
      ownerNickname: booth.owner.nickname,
      qrToken: booth.qrToken,
    },
    stats: {
      totalVisits,
      uniqueVisitors,
    },
    recentLogs: mapBoothVisitLogs(recentLogs),
  };
}
