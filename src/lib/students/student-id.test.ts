import { describe, expect, it } from "vitest";
import { describeStudentId, formatStudentId } from "@/lib/students/student-id";

describe("formatStudentId", () => {
  it("pads class and student numbers to two digits", () => {
    expect(
      formatStudentId({ grade: 1, classNumber: 12, studentNumber: 27 }),
    ).toBe("11227");
    expect(
      formatStudentId({ grade: 2, classNumber: 3, studentNumber: 7 }),
    ).toBe("20307");
  });

  it("returns null when information is missing", () => {
    expect(formatStudentId({ grade: 2, classNumber: null, studentNumber: 1 })).toBeNull();
  });
});

describe("describeStudentId", () => {
  it("falls back to default label when formatting fails", () => {
    expect(describeStudentId({ grade: null, classNumber: null, studentNumber: null })).toBe("학번 미지정");
    expect(describeStudentId({ grade: null, classNumber: null, studentNumber: null }, "정보 없음")).toBe(
      "정보 없음",
    );
  });
});
