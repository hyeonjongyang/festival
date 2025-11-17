import { describe, expect, it } from "vitest";
import { STUDENT_WORKSHEET_COLUMNS } from "@/lib/accounts/student-batch";

describe("STUDENT_WORKSHEET_COLUMNS", () => {
  it("covers all required student fields", () => {
    const headers = STUDENT_WORKSHEET_COLUMNS.map((column) => column.header);
    const keys = STUDENT_WORKSHEET_COLUMNS.map((column) => column.key);

    ["학년", "반", "번호", "로그인 코드", "학번"].forEach((header) => {
      expect(headers).toContain(header);
    });

    ["grade", "classNumber", "studentNumber", "code", "studentId"].forEach((key) => {
      expect(keys).toContain(key as typeof STUDENT_WORKSHEET_COLUMNS[number]["key"]);
    });
  });
});
