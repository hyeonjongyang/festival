import type { Prisma, PointViolationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_ACTIVE_BOOTH_WINDOW_HOURS,
  ADMIN_RECENT_POINT_LOG_LIMIT,
  ADMIN_RECENT_POST_LIMIT,
  ADMIN_WARNING_LIMIT,
} from "@/lib/config/constants";
import { formatStudentLabel } from "@/lib/points/logs";

type RecentPostRecord = Prisma.PostGetPayload<{
  select: {
    id: true;
    body: true;
    createdAt: true;
    booth: {
      select: {
        name: true;
      };
    };
    author: {
      select: {
        nickname: true;
      };
    };
  };
}>;

type RecentPointLogRecord = Prisma.PointLogGetPayload<{
  select: {
    id: true;
    points: true;
    awardedAt: true;
    booth: {
      select: {
        name: true;
      };
    };
    student: {
      select: {
        nickname: true;
        grade: true;
        classNumber: true;
        studentNumber: true;
      };
    };
  };
}>;

type PointViolationRecord = Prisma.PointViolationGetPayload<{
  include: {
    booth: {
      select: {
        name: true;
      };
    };
    student: {
      select: {
        nickname: true;
        grade: true;
        classNumber: true;
        studentNumber: true;
      };
    };
  };
}>;

export type AdminStats = {
  totalAwards: number;
  totalPointsAwarded: number;
  activeBooths: number;
  totalPosts: number;
};

export type AdminRecentPost = {
  id: string;
  createdAt: string;
  boothName: string;
  authorNickname: string;
  preview: string;
};

export type AdminRecentPointLog = {
  id: string;
  awardedAt: string;
  boothName: string;
  studentNickname: string;
  studentLabel: string;
  points: number;
};

export type AdminWarning = {
  id: string;
  type: PointViolationType;
  severity: "warning" | "critical";
  detectedAt: string;
  lastAwardedAt: string;
  availableAt: string;
  boothName: string;
  studentNickname: string;
  studentLabel: string;
  summary: string;
};

export type AdminDashboardData = {
  stats: AdminStats;
  recentPosts: AdminRecentPost[];
  recentPointLogs: AdminRecentPointLog[];
  warnings: AdminWarning[];
};

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const activeWindowStart = new Date(
    Date.now() - ADMIN_ACTIVE_BOOTH_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const [
    awardAggregate,
    activeBoothCount,
    totalPosts,
    recentPosts,
    recentPointLogs,
    violations,
  ] = await prisma.$transaction([
    prisma.pointLog.aggregate({
      _count: {
        _all: true,
      },
      _sum: {
        points: true,
      },
    }),
    prisma.booth.count({
      where: {
        pointLogs: {
          some: {
            awardedAt: {
              gte: activeWindowStart,
            },
          },
        },
      },
    }),
    prisma.post.count(),
    prisma.post.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: ADMIN_RECENT_POST_LIMIT,
      select: {
        id: true,
        body: true,
        createdAt: true,
        booth: {
          select: {
            name: true,
          },
        },
        author: {
          select: {
            nickname: true,
          },
        },
      },
    }),
    prisma.pointLog.findMany({
      orderBy: {
        awardedAt: "desc",
      },
      take: ADMIN_RECENT_POINT_LOG_LIMIT,
      select: {
        id: true,
        points: true,
        awardedAt: true,
        booth: {
          select: {
            name: true,
          },
        },
        student: {
          select: {
            nickname: true,
            grade: true,
            classNumber: true,
            studentNumber: true,
          },
        },
      },
    }),
    prisma.pointViolation.findMany({
      orderBy: {
        detectedAt: "desc",
      },
      take: ADMIN_WARNING_LIMIT,
      include: {
        booth: {
          select: {
            name: true,
          },
        },
        student: {
          select: {
            nickname: true,
            grade: true,
            classNumber: true,
            studentNumber: true,
          },
        },
      },
    }),
  ]);

  return {
    stats: {
      totalAwards: awardAggregate._count?._all ?? 0,
      totalPointsAwarded: awardAggregate._sum?.points ?? 0,
      activeBooths: activeBoothCount,
      totalPosts,
    },
    recentPosts: recentPosts.map(mapRecentPost),
    recentPointLogs: recentPointLogs.map(mapRecentPointLog),
    warnings: violations.map(mapViolationRecord),
  };
}

export function mapRecentPost(record: RecentPostRecord): AdminRecentPost {
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    boothName: formatBoothName(record.booth?.name),
    authorNickname: record.author.nickname,
    preview: createPostPreview(record.body),
  };
}

export function mapRecentPointLog(
  record: RecentPointLogRecord,
): AdminRecentPointLog {
  return {
    id: record.id,
    awardedAt: record.awardedAt.toISOString(),
    boothName: formatBoothName(record.booth?.name),
    studentNickname: record.student.nickname,
    studentLabel: formatStudentLabel(record.student),
    points: record.points,
  };
}

export function mapViolationRecord(record: PointViolationRecord): AdminWarning {
  return {
    id: record.id,
    type: record.type,
    severity: inferViolationSeverity(record.type),
    detectedAt: record.detectedAt.toISOString(),
    lastAwardedAt: record.lastAwardedAt.toISOString(),
    availableAt: record.availableAt.toISOString(),
    boothName: formatBoothName(record.booth?.name),
    studentNickname: record.student.nickname,
    studentLabel: formatStudentLabel(record.student),
    summary: formatViolationSummary(record),
  };
}

function inferViolationSeverity(
  type: PointViolationType,
): "warning" | "critical" {
  switch (type) {
    case "DUPLICATE_AWARD":
      return "warning";
    default:
      return "warning";
  }
}

function formatViolationSummary(record: PointViolationRecord): string {
  switch (record.type) {
    case "DUPLICATE_AWARD": {
      return "30분 이내 중복 지급 시도가 차단되었습니다.";
    }
    default:
      return "관찰이 필요한 이벤트가 감지되었습니다.";
  }
}

function createPostPreview(body: string, maxLength = 80): string {
  const normalized = body.replace(/\s+/g, " ").trim();

  if (normalized.length === 0) {
    return "내용 없음";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatBoothName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "이름 없는 부스";
}
