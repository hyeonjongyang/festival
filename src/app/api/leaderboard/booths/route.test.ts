import { afterEach, describe, expect, it, vi } from "vitest";
import type { BoothLeaderboardResult } from "@/lib/leaderboard";
import { GET } from "./route";

const fetchBoothLeaderboardMock = vi.hoisted(() =>
  vi.fn<() => Promise<BoothLeaderboardResult>>(),
);

vi.mock("@/lib/leaderboard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/leaderboard")>(
    "@/lib/leaderboard",
  );

  return {
    ...actual,
    fetchBoothLeaderboard: fetchBoothLeaderboardMock,
  };
});

afterEach(() => {
  fetchBoothLeaderboardMock.mockReset();
});

describe("GET /api/leaderboard/booths", () => {
  it("returns booth leaderboard data", async () => {
    const payload: BoothLeaderboardResult = {
      generatedAt: new Date().toISOString(),
      totalBooths: 0,
      entries: [],
    };

    fetchBoothLeaderboardMock.mockResolvedValueOnce(payload);

    const request = new Request(
      "https://example.com/api/leaderboard/booths",
    );
    const response = await GET(request);

    expect(fetchBoothLeaderboardMock).toHaveBeenCalledTimes(1);
    expect(fetchBoothLeaderboardMock).toHaveBeenCalledWith();
    expect(response.status).toBe(200);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json.leaderboard).toEqual(payload);
  });

  it("returns 500 when fetching fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchBoothLeaderboardMock.mockRejectedValueOnce(new Error("boom"));

    const request = new Request(
      "https://example.com/api/leaderboard/booths",
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json.message).toBe("부스 리더보드를 불러오지 못했습니다.");
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
