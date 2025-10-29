import { beforeEach, describe, expect, it, vi } from "vitest";
import { PointViolationType } from "@prisma/client";
import {
  fetchAdminDashboard,
  mapRecentPointLog,
  mapRecentPost,
  mapViolationRecord,
} from "@/lib/admin/dashboard";

const prismaMocks = vi.hoisted(() => {
  return {
    pointLogAggregate: vi.fn(),
    boothCount: vi.fn(),
    postCount: vi.fn(),
    postFindMany: vi.fn(),
    pointLogFindMany: vi.fn(),
    pointViolationFindMany: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      pointLog: {
        aggregate: prismaMocks.pointLogAggregate,
        findMany: prismaMocks.pointLogFindMany,
      },
      booth: {
        count: prismaMocks.boothCount,
      },
      post: {
        count: prismaMocks.postCount,
        findMany: prismaMocks.postFindMany,
      },
      pointViolation: {
        findMany: prismaMocks.pointViolationFindMany,
      },
      $transaction: async (promises: Promise<unknown>[]) => {
        return Promise.all(promises);
      },
    },
  };
});

const {
  pointLogAggregate,
  boothCount,
  postCount,
  postFindMany,
  pointLogFindMany,
  pointViolationFindMany,
} = prismaMocks;

beforeEach(() => {
  vi.clearAllMocks();

  pointLogAggregate.mockResolvedValue({
    _count: { _all: 3 },
    _sum: { points: 90 },
  });

  boothCount.mockResolvedValue(2);
  postCount.mockResolvedValue(5);
  postFindMany.mockResolvedValue([
    {
      id: "post_1",
      body: " 첫 번째   게시글 입니다.   ",
      createdAt: new Date("2024-05-12T00:00:00.000Z"),
      booth: { name: "포토존" },
      author: { nickname: "은하수" },
    },
  ]);

  pointLogFindMany.mockResolvedValue([
    {
      id: "log_1",
      points: 30,
      awardedAt: new Date("2024-05-12T01:00:00.000Z"),
      booth: { name: "게임존" },
      student: {
        nickname: "별빛",
        grade: 2,
        classNumber: 3,
        studentNumber: 12,
      },
    },
  ]);

  pointViolationFindMany.mockResolvedValue([
    {
      id: "violation_1",
      type: PointViolationType.DUPLICATE_AWARD,
      detectedAt: new Date("2024-05-12T01:10:00.000Z"),
      lastAwardedAt: new Date("2024-05-12T00:55:00.000Z"),
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
      author: { nickname: "소라" },
    } as const;

    const mapped = mapRecentPost(record);

    expect(mapped.preview).toMatch(/^여러 줄로 이루어진 본문이 존재합니다\./);
    expect(mapped.boothName).toBe("포토존");
    expect(mapped.authorNickname).toBe("소라");
  });
});

describe("mapRecentPointLog", () => {
  it("formats the student label and timestamps", () => {
    const record = {
      id: "log_1",
      points: 30,
      awardedAt: new Date("2024-05-12T01:00:00.000Z"),
      booth: { name: "게임존" },
      student: {
        nickname: "별빛",
        grade: 2,
        classNumber: 3,
        studentNumber: 12,
      },
    } as const;

    const mapped = mapRecentPointLog(record);

    expect(mapped.studentLabel).toBe("2학년 3반 12번");
    expect(mapped.boothName).toBe("게임존");
    expect(mapped.awardedAt).toBe("2024-05-12T01:00:00.000Z");
  });
});

describe("mapViolationRecord", () => {
  it("returns a warning summary and metadata", () => {
    const record = {
      id: "violation_1",
      type: PointViolationType.DUPLICATE_AWARD,
      detectedAt: new Date("2024-05-12T01:10:00.000Z"),
      lastAwardedAt: new Date("2024-05-12T00:55:00.000Z"),
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
    expect(mapped.summary).toContain("중복 지급");
    expect(mapped.availableAt).toBe("2024-05-12T01:25:00.000Z");
  });
});

describe("fetchAdminDashboard", () => {
  it("composes statistics, recent activity and warnings", async () => {
    const dashboard = await fetchAdminDashboard();

    expect(pointLogAggregate).toHaveBeenCalledTimes(1);
    expect(boothCount).toHaveBeenCalledTimes(1);
    expect(postCount).toHaveBeenCalledTimes(1);

    expect(dashboard.stats).toEqual({
      totalAwards: 3,
      totalPointsAwarded: 90,
      activeBooths: 2,
      totalPosts: 5,
    });

    expect(dashboard.recentPosts).toHaveLength(1);
    expect(dashboard.recentPointLogs[0]?.studentNickname).toBe("별빛");
    expect(dashboard.warnings[0]?.type).toBe(PointViolationType.DUPLICATE_AWARD);
  });
});
