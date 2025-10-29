import { describe, expect, it } from "vitest";
import {
  normalizeLeaderboardGrade,
  rankLeaderboardRecords,
  sortLeaderboardRecords,
  type LeaderboardRecord,
} from "@/lib/leaderboard";

describe("normalizeLeaderboardGrade", () => {
  it("returns all when input is missing or invalid", () => {
    expect(normalizeLeaderboardGrade(undefined)).toBe("all");
    expect(normalizeLeaderboardGrade("")).toBe("all");
    expect(normalizeLeaderboardGrade("unknown")).toBe("all");
    expect(normalizeLeaderboardGrade(0)).toBe("all");
  });

  it("accepts numeric strings and coerces them to numbers", () => {
    expect(normalizeLeaderboardGrade("1")).toBe(1);
    expect(normalizeLeaderboardGrade(" 2 ")).toBe(2);
    expect(normalizeLeaderboardGrade("03")).toBe("all");
  });

  it("passes through already-normalized grade values", () => {
    expect(normalizeLeaderboardGrade(2)).toBe(2);
    expect(normalizeLeaderboardGrade("all")).toBe("all");
  });
});

describe("sortLeaderboardRecords", () => {
  it("sorts by points descending and nickname ascending when tied", () => {
    const records = [
      makeRecord({ id: "alpha", nickname: "하마", points: 90 }),
      makeRecord({ id: "beta", nickname: "가방", points: 120 }),
      makeRecord({ id: "gamma", nickname: "나비", points: 120 }),
      makeRecord({ id: "delta", nickname: "다람쥐", points: 50 }),
    ];

    const sorted = sortLeaderboardRecords(records);
    expect(sorted.map((record) => record.id)).toEqual([
      "beta",
      "gamma",
      "alpha",
      "delta",
    ]);
  });
});

describe("rankLeaderboardRecords", () => {
  it("assigns dense ranks and exposes formatted labels", () => {
    const records = [
      makeRecord({
        id: "beta",
        nickname: "가방",
        points: 120,
        grade: 2,
        classNumber: 3,
        studentNumber: 4,
      }),
      makeRecord({
        id: "gamma",
        nickname: "나비",
        points: 120,
        grade: 2,
        classNumber: 1,
        studentNumber: 8,
      }),
      makeRecord({
        id: "alpha",
        nickname: "하마",
        points: 90,
        grade: 1,
        classNumber: 2,
        studentNumber: 10,
      }),
      makeRecord({
        id: "delta",
        nickname: "다람쥐",
        points: 50,
        grade: null,
        classNumber: null,
        studentNumber: null,
      }),
    ];

    const ranked = rankLeaderboardRecords(records);

    expect(ranked.map((entry) => entry.rank)).toEqual([1, 1, 2, 3]);
    expect(ranked[0]?.profileLabel).toBe("2학년 3반 4번");
    expect(ranked[3]?.profileLabel).toBe("학년 정보 없음");
  });
});

function makeRecord(
  input: Partial<LeaderboardRecord> &
    Pick<LeaderboardRecord, "id" | "nickname" | "points">,
): LeaderboardRecord {
  return {
    id: input.id,
    nickname: input.nickname,
    points: input.points,
    grade: input.grade ?? null,
    classNumber: input.classNumber ?? null,
    studentNumber: input.studentNumber ?? null,
  };
}
