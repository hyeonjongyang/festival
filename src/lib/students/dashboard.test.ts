import { describe, expect, it } from "vitest";
import { mapPointLogs } from "@/lib/students/dashboard";

describe("mapPointLogs", () => {
  it("converts Date objects to ISO strings and preserves ordering", () => {
    const now = new Date("2024-01-01T09:00:00.000Z");
    const later = new Date("2024-01-01T10:00:00.000Z");

    const input = [
      {
        id: "log-1",
        points: 30,
        awardedAt: now,
        booth: { name: "미디어 부스" },
      },
      {
        id: "log-2",
        points: 15,
        awardedAt: later,
        booth: { name: null },
      },
    ];

    const mapped = mapPointLogs(input);

    expect(mapped).toEqual([
      {
        id: "log-1",
        points: 30,
        boothName: "미디어 부스",
        awardedAt: now.toISOString(),
      },
      {
        id: "log-2",
        points: 15,
        boothName: "이름 없는 부스",
        awardedAt: later.toISOString(),
      },
    ]);
  });
});
