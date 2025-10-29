import { describe, expect, it } from "vitest";
import {
  MAX_NICKNAME_SUGGESTIONS,
  getNicknameSuggestions,
  nicknameSchema,
  normalizeNickname,
} from "@/lib/students/nickname";

describe("normalizeNickname", () => {
  it("collapses duplicated spaces and trims edges", () => {
    expect(normalizeNickname("  빠른   여우  ")).toBe("빠른 여우");
  });
});

describe("nicknameSchema", () => {
  it("accepts valid strings and returns the sanitized value", () => {
    const result = nicknameSchema.parse(" 용감한  호랑이 ");
    expect(result).toBe("용감한 호랑이");
  });

  it("rejects disallowed characters", () => {
    expect(() => nicknameSchema.parse("나쁜*닉네임")).toThrow(
      /닉네임은 한글, 영문, 숫자, 공백만 사용할 수 있습니다./,
    );
  });
});

describe("getNicknameSuggestions", () => {
  it("clamps the length to the configured max value", () => {
    const suggestions = getNicknameSuggestions(999);
    expect(suggestions).toHaveLength(MAX_NICKNAME_SUGGESTIONS);
  });

  it("falls back to default length when input is invalid", () => {
    const suggestions = getNicknameSuggestions(Number.NaN);
    expect(suggestions).toHaveLength(3);
  });
});
