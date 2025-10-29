import { describe, expect, it } from "vitest";
import {
  NicknameLockedError,
  StudentAccessError,
} from "@/lib/students/errors";

describe("StudentAccessError", () => {
  it("has a stable name and default message", () => {
    const error = new StudentAccessError();
    expect(error.name).toBe("StudentAccessError");
    expect(error.message).toBe("학생 계정만 접근할 수 있습니다.");
  });
});

describe("NicknameLockedError", () => {
  it("has a stable name and default message", () => {
    const error = new NicknameLockedError();
    expect(error.name).toBe("NicknameLockedError");
    expect(error.message).toBe("닉네임을 더 이상 변경할 수 없습니다.");
  });
});
