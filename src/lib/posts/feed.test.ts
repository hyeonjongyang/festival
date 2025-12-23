import { describe, expect, it } from "vitest";
import { mapFeedRecord, toPublicImageUrl } from "@/lib/posts/feed";

describe("mapFeedRecord", () => {
  it("transforms prisma record into feed item", () => {
    const createdAt = new Date("2024-05-02T09:00:00.000Z");

    const item = mapFeedRecord(
      {
        id: "post_1",
        body: "축제 사진 자랑",
        imagePath: "uploads/posts/post_1/image.jpg",
        createdAt,
        booth: {
        id: "booth_1",
        name: " 은하 카페 ",
        location: "본관 1층",
      },
      author: {
        id: "user_1",
        role: "STUDENT",
        nickname: "은하토끼",
        grade: 1,
        classNumber: 2,
        studentNumber: 7,
      },
      },
      new Map([["booth_1", { average: 4.8666, count: 12 }]]),
    );

    expect(item).toEqual({
      id: "post_1",
      body: "축제 사진 자랑",
      imageUrl: "/api/uploads/posts/post_1/image.jpg",
      createdAt: createdAt.toISOString(),
      authorId: "user_1",
      boothId: "booth_1",
      boothName: "은하 카페",
      boothLocation: "본관 1층",
      authorName: "10207",
      boothRatingAverage: 4.9,
      boothRatingCount: 12,
    });
  });

  it("falls back to defaults when optional fields are missing", () => {
    const createdAt = new Date("2024-05-02T09:00:00.000Z");

    const item = mapFeedRecord({
      id: "post_2",
      body: "이미지 없이도 게시됩니다.",
      imagePath: null,
      createdAt,
      booth: null,
      author: {
        id: "user_2",
        role: "BOOTH_MANAGER",
        nickname: "별빛여우",
        grade: null,
        classNumber: null,
        studentNumber: null,
      },
    });

    expect(item).toEqual({
      id: "post_2",
      body: "이미지 없이도 게시됩니다.",
      imageUrl: null,
      createdAt: createdAt.toISOString(),
      authorId: "user_2",
      boothId: null,
      boothName: "이름 없는 부스",
      boothLocation: null,
      authorName: "별빛여우",
      boothRatingAverage: null,
      boothRatingCount: 0,
    });
  });
});

describe("toPublicImageUrl", () => {
  it("returns null when path is missing", () => {
    expect(toPublicImageUrl(null)).toBeNull();
    expect(toPublicImageUrl(undefined)).toBeNull();
  });

  it("ensures the path begins with a slash", () => {
    expect(toPublicImageUrl("/uploads/posts/post_3/image.png")).toBe(
      "/api/uploads/posts/post_3/image.png",
    );
    expect(toPublicImageUrl("uploads/posts/post_3/image.png")).toBe(
      "/api/uploads/posts/post_3/image.png",
    );
  });
});
