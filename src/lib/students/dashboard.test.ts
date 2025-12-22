import { describe, expect, it } from "vitest";
import { mapVisitLogs } from "@/lib/students/dashboard";

describe("mapVisitLogs", () => {
  it("converts Date objects to ISO strings and preserves ordering", () => {
    const now = new Date("2024-01-01T09:00:00.000Z");
    const later = new Date("2024-01-01T10:00:00.000Z");

    const input = [
      {
        id: "log-1",
        visitedAt: now,
        booth: { id: "booth-1", name: "미디어 부스", ratings: [{ score: 5, review: "최고예요" }] },
      },
      {
        id: "log-2",
        visitedAt: later,
        booth: { id: "booth-2", name: null, ratings: [] },
      },
    ];

    const mapped = mapVisitLogs(input);

    expect(mapped).toEqual([
      {
        id: "log-1",
        boothId: "booth-1",
        boothName: "미디어 부스",
        visitedAt: now.toISOString(),
        rating: 5,
        review: "최고예요",
      },
      {
        id: "log-2",
        boothId: "booth-2",
        boothName: "이름 없는 부스",
        visitedAt: later.toISOString(),
        rating: null,
        review: null,
      },
    ]);
  });
});
