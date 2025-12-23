import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisitViolationType } from "@prisma/client";
import {
  fetchAdminDashboard,
  mapRecentVisitLog,
  mapRecentPost,
  mapViolationRecord,
} from "@/lib/admin/dashboard";

const prismaMocks = vi.hoisted(() => {
  return {
    boothVisitCount: vi.fn(),
    boothVisitGroupBy: vi.fn(),
    boothCount: vi.fn(),
    postCount: vi.fn(),
    postFindMany: vi.fn(),
    boothVisitFindMany: vi.fn(),
    visitViolationFindMany: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      boothVisit: {
        count: prismaMocks.boothVisitCount,
        groupBy: prismaMocks.boothVisitGroupBy,
        findMany: prismaMocks.boothVisitFindMany,
      },
      booth: {
        count: prismaMocks.boothCount,
      },
      post: {
        count: prismaMocks.postCount,
        findMany: prismaMocks.postFindMany,
      },
      visitViolation: {
        findMany: prismaMocks.visitViolationFindMany,
      },
      $transaction: async (promises: Promise<unknown>[]) => {
        return Promise.all(promises);
      },
    },
  };
});

const {
  boothVisitCount,
  boothVisitGroupBy,
  boothCount,
  postCount,
  postFindMany,
  boothVisitFindMany,
  visitViolationFindMany,
} = prismaMocks;

beforeEach(() => {
  vi.clearAllMocks();

  boothVisitCount.mockReset();
  boothVisitCount.mockResolvedValue(3);

  boothVisitGroupBy.mockReset();
  boothVisitGroupBy.mockResolvedValue([
    { studentId: "student_1", _count: { _all: 2 } },
    { studentId: "student_2", _count: { _all: 1 } },
  ]);

  boothCount.mockResolvedValue(2);
  postCount.mockResolvedValue(5);
  postFindMany.mockResolvedValue([
    {
      id: "post_1",
      body: " 첫 번째   게시글 입니다.   ",
      createdAt: new Date("2024-05-12T00:00:00.000Z"),
      booth: { name: "포토존" },
      author: {
        id: "user_1",
        role: "BOOTH_MANAGER",
        nickname: "은하수",
        grade: null,
        classNumber: null,
        studentNumber: null,
      },
    },
  ]);

  boothVisitFindMany.mockResolvedValue([
    {
      id: "log_1",
      visitedAt: new Date("2024-05-12T01:00:00.000Z"),
      booth: { name: "게임존" },
      student: {
        nickname: "별빛",
        grade: 2,
        classNumber: 3,
        studentNumber: 12,
      },
    },
  ]);
  visitViolationFindMany.mockResolvedValue([
    {
      id: "violation_1",
      type: VisitViolationType.DUPLICATE_VISIT,
      detectedAt: new Date("2024-05-12T01:10:00.000Z"),
      lastVisitedAt: new Date("2024-05-12T00:55:00.000Z"),
      availableAt: new Date("2024-05-12T01:25:00.000Z"),
      booth: { name: "게임존" },
      student: {
        nickname: "별빛",
        grade: 2,
        classNumber: 3,
        studentNumber: 12,
      },
    },
  ]);
});

describe("mapRecentPost", () => {
  it("normalizes whitespace and truncates long bodies", () => {
    const record = {
      id: "post_1",
      body: "  여러 줄로   이루어진 본문이 존재합니다. 추가 설명이 뒤따릅니다. ",
      createdAt: new Date("2024-05-12T00:00:00.000Z"),
      booth: { name: "포토존" },
      author: {
        id: "user_2",
        role: "ADMIN",
        nickname: "소라",
        grade: null,
        classNumber: null,
        studentNumber: null,
      },
    } as const;

    const mapped = mapRecentPost(record);

    expect(mapped.preview).toMatch(/^여러 줄로 이루어진 본문이 존재합니다\./);
    expect(mapped.boothName).toBe("포토존");
    expect(mapped.authorName).toBe("소라");
  });
});

describe("mapRecentVisitLog", () => {
  it("formats the student label and timestamps", () => {
    const record = {
      id: "log_1",
      visitedAt: new Date("2024-05-12T01:00:00.000Z"),
      booth: { name: "게임존" },
      student: {
        nickname: "별빛",
        grade: 2,
        classNumber: 3,
        studentNumber: 12,
      },
    } as const;

    const mapped = mapRecentVisitLog(record);

    expect(mapped.studentLabel).toBe("2학년 3반 12번");
    expect(mapped.studentIdentifier).toBe("20312");
    expect(mapped.boothName).toBe("게임존");
    expect(mapped.visitedAt).toBe("2024-05-12T01:00:00.000Z");
  });
});

	describe("mapViolationRecord", () => {
	  it("returns a warning summary and metadata", () => {
	    const record = {
	      id: "violation_1",
	      boothId: "booth_1",
	      studentId: "student_1",
	      type: VisitViolationType.DUPLICATE_VISIT,
	      detectedAt: new Date("2024-05-12T01:10:00.000Z"),
	      lastVisitedAt: new Date("2024-05-12T00:55:00.000Z"),
	      availableAt: new Date("2024-05-12T01:25:00.000Z"),
	      booth: { name: "게임존" },
      student: {
        nickname: "별빛",
        grade: 2,
        classNumber: 3,
        studentNumber: 12,
      },
    } as const;

    const mapped = mapViolationRecord(record);

    expect(mapped.severity).toBe("warning");
    expect(mapped.summary).toContain("재방문");
    expect(mapped.lastVisitedAt).toBe("2024-05-12T00:55:00.000Z");
    expect(mapped.studentIdentifier).toBe("20312");
  });
});

describe("fetchAdminDashboard", () => {
  it("composes statistics, recent activity and warnings", async () => {
    const dashboard = await fetchAdminDashboard();

    expect(boothVisitCount).toHaveBeenCalledTimes(1);
    expect(boothVisitGroupBy).toHaveBeenCalledTimes(1);
    expect(boothCount).toHaveBeenCalledTimes(1);
    expect(postCount).toHaveBeenCalledTimes(1);

    expect(dashboard.stats).toEqual({
      totalVisits: 3,
      uniqueVisitors: 2,
      activeBooths: 2,
      totalPosts: 5,
    });

    expect(dashboard.recentPosts).toHaveLength(1);
    expect(dashboard.recentVisitLogs[0]?.studentIdentifier).toBe("20312");
    expect(dashboard.warnings[0]?.type).toBe(VisitViolationType.DUPLICATE_VISIT);
  });
});
