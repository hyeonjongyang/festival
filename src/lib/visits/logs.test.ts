import { describe, expect, it } from "vitest";
import { formatStudentLabel, mapBoothVisitLog } from "@/lib/visits/logs";

describe("formatStudentLabel", () => {
  it("joins existing grade/class/number segments", () => {
    expect(formatStudentLabel({ grade: 2, classNumber: 3, studentNumber: 15 })).toBe(
      "2학년 3반 15번",
    );
  });

  it("returns fallback when values are missing", () => {
    expect(formatStudentLabel({ grade: null, classNumber: null, studentNumber: null })).toBe(
      "학년 정보 없음",
    );
  });
});

describe("mapBoothVisitLog", () => {
  it("normalizes prisma record into client payload", () => {
    const visitedAt = new Date("2024-05-12T00:00:00.000Z");

    const payload = mapBoothVisitLog({
      id: "visit_1",
      visitedAt,
      booth: {
        id: "booth_1",
        name: "게임존",
      },
      student: {
        id: "student_1",
        nickname: "은하토끼",
        grade: 1,
        classNumber: 2,
        studentNumber: 7,
      },
    });

    expect(payload).toEqual({
      id: "visit_1",
      visitedAt: visitedAt.toISOString(),
      boothId: "booth_1",
      boothName: "게임존",
      studentId: "student_1",
      studentIdentifier: "10207",
      studentLabel: "1학년 2반 7번",
      grade: 1,
      classNumber: 2,
      studentNumber: 7,
    });
  });
});
