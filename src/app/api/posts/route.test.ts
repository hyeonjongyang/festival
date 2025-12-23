import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeedPage, FeedPageParams } from "@/lib/posts/feed";
import { GET } from "./route";

const fetchFeedPageMock = vi.hoisted(() =>
  vi.fn<(params?: FeedPageParams) => Promise<FeedPage>>(),
);

vi.mock("@/lib/posts/feed", async () => {
  const actual = await vi.importActual<typeof import("@/lib/posts/feed")>(
    "@/lib/posts/feed",
  );

  return {
    ...actual,
    fetchFeedPage: fetchFeedPageMock,
  };
});

afterEach(() => {
  fetchFeedPageMock.mockReset();
});

describe("GET /api/posts", () => {
  it("returns feed data with no-store cache control", async () => {
    const payload: FeedPage = {
      items: [],
      nextCursor: null,
    };

    fetchFeedPageMock.mockResolvedValueOnce(payload);

    const request = new Request("https://example.com/api/posts?limit=8");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const json = (await response.json()) as Record<string, unknown>;
    expect(json.feed).toEqual(payload);
  });

  it("returns 500 when fetching fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchFeedPageMock.mockRejectedValueOnce(new Error("boom"));

    const request = new Request("https://example.com/api/posts");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json.message).toBe("피드를 불러오지 못했습니다.");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
