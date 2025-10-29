import { afterEach, describe, expect, it, vi } from "vitest";
import { NicknameLockedError } from "@/lib/students/errors";
import { GET, PATCH } from "./route";

const getSessionUserMock = vi.hoisted(() => vi.fn());
const getNicknameSuggestionsMock = vi.hoisted(() => vi.fn());
const updateStudentNicknameMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/get-session-user", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/students/nickname", () => ({
  getNicknameSuggestions: getNicknameSuggestionsMock,
  updateStudentNickname: updateStudentNicknameMock,
}));

afterEach(() => {
  getSessionUserMock.mockReset();
  getNicknameSuggestionsMock.mockReset();
  updateStudentNicknameMock.mockReset();
});

describe("/api/students/nickname", () => {
  it("returns nickname suggestions for the authenticated student", async () => {
    getSessionUserMock.mockResolvedValueOnce({
      id: "student-1",
      role: "STUDENT",
    });
    getNicknameSuggestionsMock.mockReturnValueOnce(["별님", "미르"]);

    const response = await GET(
      new Request("https://example.com/api/students/nickname?count=3"),
    );

    expect(response.status).toBe(200);
    expect(getNicknameSuggestionsMock).toHaveBeenCalledWith(3);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json.suggestions).toEqual(["별님", "미르"]);
  });

  it("rejects unauthenticated requests", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);

    const response = await GET(
      new Request("https://example.com/api/students/nickname"),
    );

    expect(response.status).toBe(401);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json.message).toMatch("학생 계정만");
  });

  it("updates nickname when payload is valid", async () => {
    getSessionUserMock.mockResolvedValueOnce({
      id: "student-42",
      role: "STUDENT",
    });
    updateStudentNicknameMock.mockResolvedValueOnce({
      nickname: "축제의 별",
      nicknameLocked: false,
    });

    const response = await PATCH(
      new Request("https://example.com/api/students/nickname", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: "축제의 별" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateStudentNicknameMock).toHaveBeenCalledWith({
      userId: "student-42",
      nickname: "축제의 별",
      lock: undefined,
    });
    const json = (await response.json()) as Record<string, unknown>;
    expect(json.nickname).toBe("축제의 별");
  });

  it("returns 409 when nickname is already locked", async () => {
    getSessionUserMock.mockResolvedValueOnce({
      id: "student-77",
      role: "STUDENT",
    });
    updateStudentNicknameMock.mockRejectedValueOnce(
      new NicknameLockedError("이미 닉네임을 확정했습니다."),
    );

    const response = await PATCH(
      new Request("https://example.com/api/students/nickname", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: "축제의 별", lock: true }),
      }),
    );

    expect(response.status).toBe(409);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json.message).toBe("이미 닉네임을 확정했습니다.");
  });
});
