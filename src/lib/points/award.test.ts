import { describe, expect, it } from "vitest";
import { calculateThrottleExpiry } from "@/lib/points/award";

describe("calculateThrottleExpiry", () => {
  it("adds the default 30 minute window", () => {
    const awardedAt = new Date("2024-05-12T00:00:00.000Z");
    const expected = new Date("2024-05-12T00:30:00.000Z");

    expect(calculateThrottleExpiry(awardedAt)).toEqual(expected);
  });

  it("respects custom window minutes", () => {
    const awardedAt = new Date("2024-05-12T00:00:00.000Z");
    const expected = new Date("2024-05-12T00:10:00.000Z");

    expect(calculateThrottleExpiry(awardedAt, 10)).toEqual(expected);
  });

  it("falls back to default when minutes is invalid", () => {
    const awardedAt = new Date("2024-05-12T00:00:00.000Z");
    const expected = new Date("2024-05-12T00:30:00.000Z");

    expect(calculateThrottleExpiry(awardedAt, Number.NaN)).toEqual(expected);
  });
});
