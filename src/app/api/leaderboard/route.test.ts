import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  LeaderboardGradeFilter,
  LeaderboardResult,
} from "@/lib/leaderboard";
import { GET } from "./route";

const fetchLeaderboardMock = vi.hoisted(() =>
  vi.fn<Promise<LeaderboardResult>, [{ grade: LeaderboardGradeFilter }]>(),
);

vi.mock("@/lib/leaderboard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/leaderboard")>(
    "@/lib/leaderboard",
  );

  return {
    ...actual,
    fetchLeaderboard: fetchLeaderboardMock,
  };
});

afterEach(() => {
  fetchLeaderboardMock.mockReset();
});

describe("GET /api/leaderboard", () => {
  it("returns leaderboard data for a given grade", async () => {
    const payload: LeaderboardResult = {
      grade: 2,
      entries: [],
      generatedAt: new Date().toISOString(),
      totalStudents: 0,
    };

    fetchLeaderboardMock.mockResolvedValueOnce(payload);

    const request = new Request("https://example.com/api/leaderboard?grade=2");
    const response = await GET(request);

    expect(fetchLeaderboardMock).toHaveBeenCalledWith({ grade: 2 });
    expect(response.status).toBe(200);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json.leaderboard).toEqual(payload);
  });

  it("falls back to grade=all when query is missing", async () => {
    const payload: LeaderboardResult = {
      grade: "all",
      entries: [],
      generatedAt: new Date().toISOString(),
      totalStudents: 10,
    };

    fetchLeaderboardMock.mockResolvedValueOnce(payload);

    const response = await GET(new Request("https://example.com/api/leaderboard"));

    expect(fetchLeaderboardMock).toHaveBeenCalledWith({ grade: "all" });
    expect(response.status).toBe(200);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json.leaderboard).toEqual(payload);
  });

  it("returns 500 when leaderboard fetching fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchLeaderboardMock.mockRejectedValueOnce(new Error("boom"));

    const response = await GET(new Request("https://example.com/api/leaderboard"));

    expect(response.status).toBe(500);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json.message).toBe("리더보드를 불러오지 못했습니다.");
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
