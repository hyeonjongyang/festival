import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@/lib/client/time";

describe("formatRelativeTime", () => {
  it("returns '방금 전' for sub-second differences", () => {
    const now = Date.UTC(2025, 0, 1, 0, 0, 0, 0);
    const date = new Date(now - 999).toISOString();
    expect(formatRelativeTime(date, now)).toBe("방금 전");
  });

  it("formats seconds ago for under a minute", () => {
    const now = Date.UTC(2025, 0, 1, 0, 0, 30, 0);
    const date = new Date(now - 3_000).toISOString();
    expect(formatRelativeTime(date, now)).toBe("3초 전");
  });

  it("formats minutes ago at the minute boundary", () => {
    const now = Date.UTC(2025, 0, 1, 0, 2, 0, 0);
    const date = new Date(now - 60_000).toISOString();
    expect(formatRelativeTime(date, now)).toBe("1분 전");
  });

  it("formats hours ago at the hour boundary", () => {
    const now = Date.UTC(2025, 0, 1, 5, 0, 0, 0);
    const date = new Date(now - 3_600_000).toISOString();
    expect(formatRelativeTime(date, now)).toBe("1시간 전");
  });
});

