import { describe, expect, it } from "vitest";
import {
  rankBoothLeaderboardRecords,
  sortBoothLeaderboardRecords,
  type BoothLeaderboardRecord,
} from "@/lib/leaderboard";

describe("sortBoothLeaderboardRecords", () => {
  it("sorts by visit count descending and booth name ascending when tied", () => {
    const records = [
      makeBoothRecord({ id: "photo", name: "포토존", visitCount: 120 }),
      makeBoothRecord({ id: "game", name: "게임존", visitCount: 150 }),
      makeBoothRecord({ id: "event", name: "이벤트존", visitCount: 150 }),
      makeBoothRecord({ id: "food", name: "푸드트럭", visitCount: 60 }),
    ];

    const sorted = sortBoothLeaderboardRecords(records);

    expect(sorted.map((record) => record.id)).toEqual([
      "game",
      "event",
      "photo",
      "food",
    ]);
  });
});

describe("rankBoothLeaderboardRecords", () => {
  it("assigns dense ranks for booths with identical visit counts", () => {
    const records = [
      makeBoothRecord({
        id: "game",
        name: "게임존",
        visitCount: 150,
        ownerNickname: "게임왕",
        location: "운동장",
      }),
      makeBoothRecord({
        id: "event",
        name: "이벤트존",
        visitCount: 150,
        ownerNickname: "행사요정",
        location: "강당",
      }),
      makeBoothRecord({
        id: "photo",
        name: "포토존",
        visitCount: 120,
        ownerNickname: "추억저장",
        location: null,
      }),
    ];

    const ranked = rankBoothLeaderboardRecords(records);

    expect(ranked.map((entry) => entry.rank)).toEqual([1, 1, 2]);
    expect(ranked[0]?.boothName).toBe("게임존");
    expect(ranked[1]?.ownerNickname).toBe("행사요정");
    expect(ranked[2]?.location).toBeNull();
  });

  it("breaks ties by average rating when visit counts match", () => {
    const records = [
      makeBoothRecord({ id: "low", name: "낮은별점", visitCount: 10 }),
      makeBoothRecord({ id: "high", name: "높은별점", visitCount: 10 }),
      makeBoothRecord({ id: "none", name: "평점없음", visitCount: 10 }),
    ];

    const ranked = rankBoothLeaderboardRecords(
      records,
      new Map([
        ["low", { average: 3.5, count: 2 }],
        ["high", { average: 4.8, count: 15 }],
      ]),
    );

    expect(ranked.map((entry) => entry.id)).toEqual(["high", "low", "none"]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 1, 1]);
  });

  it("adds rating aggregates when available", () => {
    const records = [
      makeBoothRecord({ id: "game", name: "게임존", visitCount: 10 }),
      makeBoothRecord({ id: "photo", name: "포토존", visitCount: 8 }),
    ];

    const ranked = rankBoothLeaderboardRecords(
      records,
      new Map([["game", { average: 4.333333, count: 6 }]]),
    );

    expect(ranked[0]?.averageRating).toBeCloseTo(4.3);
    expect(ranked[0]?.ratingCount).toBe(6);
    expect(ranked[1]?.averageRating).toBeNull();
    expect(ranked[1]?.ratingCount).toBe(0);
  });
});

function makeBoothRecord(input: {
  id: string;
  name: string;
  visitCount: number;
  ownerNickname?: string;
  location?: string | null;
}): BoothLeaderboardRecord {
  return {
    id: input.id,
    name: input.name,
    location: input.location ?? null,
    owner: {
      nickname: input.ownerNickname ?? "부스장",
    },
    _count: {
      visits: input.visitCount,
    },
  };
}
