import { describe, expect, it } from "vitest";
import { StudentAccessError } from "@/lib/students/errors";

describe("StudentAccessError", () => {
  it("has a stable name and default message", () => {
    const error = new StudentAccessError();
    expect(error.name).toBe("StudentAccessError");
    expect(error.message).toBe("학생 계정만 접근할 수 있습니다.");
  });
});
