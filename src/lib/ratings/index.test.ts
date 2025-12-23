import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateBoothRating } from "@/lib/ratings";

const prismaMocks = vi.hoisted(() => {
  return {
    boothFindUnique: vi.fn(),
    boothVisitFindFirst: vi.fn(),
    boothRatingFindUnique: vi.fn(),
    boothRatingUpdate: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  type PrismaTx = {
    booth: { findUnique: typeof prismaMocks.boothFindUnique };
    boothVisit: { findFirst: typeof prismaMocks.boothVisitFindFirst };
    boothRating: {
      findUnique: typeof prismaMocks.boothRatingFindUnique;
      update: typeof prismaMocks.boothRatingUpdate;
    };
  };

  const tx: PrismaTx = {
    booth: { findUnique: prismaMocks.boothFindUnique },
    boothVisit: { findFirst: prismaMocks.boothVisitFindFirst },
    boothRating: {
      findUnique: prismaMocks.boothRatingFindUnique,
      update: prismaMocks.boothRatingUpdate,
    },
  };

  return {
    prisma: {
      $transaction: async (fn: (transaction: PrismaTx) => Promise<unknown>) =>
        fn(tx),
    },
  };
});

const { boothFindUnique, boothVisitFindFirst, boothRatingFindUnique, boothRatingUpdate } =
  prismaMocks;

beforeEach(() => {
  vi.clearAllMocks();

  boothFindUnique.mockResolvedValue({ id: "booth_1" });
  boothVisitFindFirst.mockResolvedValue({ visitedAt: new Date(Date.now()) });
  boothRatingFindUnique.mockResolvedValue({ id: "rating_1" });
  boothRatingUpdate.mockResolvedValue({
    id: "rating_1",
    boothId: "booth_1",
    studentId: "student_1",
    score: 4,
    review: "Existing review",
    createdAt: new Date("2025-12-22T00:00:00.000Z"),
  });
});

describe("updateBoothRating", () => {
  it("does not overwrite review when omitted", async () => {
    await updateBoothRating({
      boothId: "booth_1",
      studentId: "student_1",
      score: 4,
    });

    const args = boothRatingUpdate.mock.calls[0]?.[0];
    expect(args?.data).toMatchObject({ score: 4 });
    expect(args?.data).not.toHaveProperty("review");
  });

  it("clears review when explicitly null", async () => {
    await updateBoothRating({
      boothId: "booth_1",
      studentId: "student_1",
      score: 4,
      review: null,
    });

    const args = boothRatingUpdate.mock.calls[0]?.[0];
    expect(args?.data).toMatchObject({ score: 4, review: null });
  });

  it("normalizes review when provided", async () => {
    await updateBoothRating({
      boothId: "booth_1",
      studentId: "student_1",
      score: 4,
      review: "  hello  ",
    });

    const args = boothRatingUpdate.mock.calls[0]?.[0];
    expect(args?.data).toMatchObject({ score: 4, review: "hello" });
  });
});
