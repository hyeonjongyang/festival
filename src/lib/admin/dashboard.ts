import type { Prisma, VisitViolationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { describeStudentId } from "@/lib/students/student-id";
import { getUserDisplayName } from "@/lib/users/display-name";
import {
  ADMIN_ACTIVE_BOOTH_WINDOW_HOURS,
  ADMIN_RECENT_POST_LIMIT,
  ADMIN_RECENT_VISIT_LOG_LIMIT,
  ADMIN_WARNING_LIMIT,
} from "@/lib/config/constants";
import { formatStudentLabel } from "@/lib/visits/logs";

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
        id: true;
        role: true;
        nickname: true;
        grade: true;
        classNumber: true;
        studentNumber: true;
      };
    };
  };
}>;

const recentVisitLogSelect = {
  id: true,
  visitedAt: true,
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
} as const satisfies Prisma.BoothVisitSelect;

type RecentVisitLogRecord = Prisma.BoothVisitGetPayload<{
  select: typeof recentVisitLogSelect;
}>;

type VisitViolationRecord = Prisma.VisitViolationGetPayload<{
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
  totalVisits: number;
  uniqueVisitors: number;
  activeBooths: number;
  totalPosts: number;
};

export type AdminRecentPost = {
  id: string;
  createdAt: string;
  boothName: string;
  authorName: string;
  preview: string;
};

export type AdminRecentVisitLog = {
  id: string;
  visitedAt: string;
  boothName: string;
  studentIdentifier: string;
  studentLabel: string;
};

export type AdminWarning = {
  id: string;
  type: VisitViolationType;
  severity: "warning" | "critical";
  detectedAt: string;
  lastVisitedAt: string;
  boothName: string;
  studentIdentifier: string;
  studentLabel: string;
  summary: string;
};

export type AdminDashboardData = {
  stats: AdminStats;
  recentPosts: AdminRecentPost[];
  recentVisitLogs: AdminRecentVisitLog[];
  warnings: AdminWarning[];
};

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const activeWindowStart = new Date(
    Date.now() - ADMIN_ACTIVE_BOOTH_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const [
    totalVisits,
    uniqueVisitorGroups,
    activeBoothCount,
    totalPosts,
    recentPosts,
    recentVisitLogs,
    violations,
  ] = await prisma.$transaction([
    prisma.boothVisit.count(),
    prisma.boothVisit.groupBy({
      by: ["studentId"],
      _count: {
        _all: true,
      },
    }),
    prisma.booth.count({
      where: {
        visits: {
          some: {
            visitedAt: {
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
    prisma.boothVisit.findMany({
      orderBy: {
        visitedAt: "desc",
      },
      take: ADMIN_RECENT_VISIT_LOG_LIMIT,
      select: recentVisitLogSelect,
    }),
    prisma.visitViolation.findMany({
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
      totalVisits,
      uniqueVisitors: uniqueVisitorGroups.length,
      activeBooths: activeBoothCount,
      totalPosts,
    },
    recentPosts: recentPosts.map(mapRecentPost),
    recentVisitLogs: recentVisitLogs.map(mapRecentVisitLog),
    warnings: violations.map(mapViolationRecord),
  };
}

export function mapRecentPost(record: RecentPostRecord): AdminRecentPost {
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    boothName: formatBoothName(record.booth?.name),
    authorName: getUserDisplayName(record.author),
    preview: createPostPreview(record.body),
  };
}

export function mapRecentVisitLog(
  record: RecentVisitLogRecord,
): AdminRecentVisitLog {
  return {
    id: record.id,
    visitedAt: record.visitedAt.toISOString(),
    boothName: formatBoothName(record.booth?.name),
    studentIdentifier: describeStudentId(record.student),
    studentLabel: formatStudentLabel(record.student),
  };
}

export function mapViolationRecord(record: VisitViolationRecord): AdminWarning {
  return {
    id: record.id,
    type: record.type,
    severity: inferViolationSeverity(record.type),
    detectedAt: record.detectedAt.toISOString(),
    lastVisitedAt: record.lastVisitedAt.toISOString(),
    boothName: formatBoothName(record.booth?.name),
    studentIdentifier: describeStudentId(record.student),
    studentLabel: formatStudentLabel(record.student),
    summary: formatViolationSummary(record),
  };
}

function inferViolationSeverity(
  type: VisitViolationType,
): "warning" | "critical" {
  switch (type) {
    case "DUPLICATE_VISIT":
      return "warning";
    default:
      return "warning";
  }
}

function formatViolationSummary(record: VisitViolationRecord): string {
  switch (record.type) {
    case "DUPLICATE_VISIT": {
      return "이미 방문한 부스를 재방문하려는 시도가 감지되어 차단했습니다.";
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
