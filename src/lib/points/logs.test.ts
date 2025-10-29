import { describe, expect, it } from "vitest";
import { formatStudentLabel, mapBoothPointLog } from "@/lib/points/logs";

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

describe("mapBoothPointLog", () => {
  it("normalizes prisma record into client payload", () => {
    const awardedAt = new Date("2024-05-12T00:00:00.000Z");

    const payload = mapBoothPointLog({
      id: "log_1",
      points: 30,
      awardedAt,
      student: {
        id: "student_1",
        nickname: "은하토끼",
        grade: 1,
        classNumber: 2,
        studentNumber: 7,
      },
    });

    expect(payload).toEqual({
      id: "log_1",
      points: 30,
      awardedAt: awardedAt.toISOString(),
      studentId: "student_1",
      studentNickname: "은하토끼",
      studentLabel: "1학년 2반 7번",
      grade: 1,
      classNumber: 2,
      studentNumber: 7,
    });
  });
});
