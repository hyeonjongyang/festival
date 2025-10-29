import { describe, expect, it } from "vitest";
import { mapFeedRecord, toPublicImageUrl } from "@/lib/posts/feed";

describe("mapFeedRecord", () => {
  it("transforms prisma record into feed item", () => {
    const createdAt = new Date("2024-05-02T09:00:00.000Z");

    const item = mapFeedRecord({
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
        nickname: "은하토끼",
      },
      _count: {
        hearts: 5,
      },
      hearts: [{ id: "heart_1" }],
    });

    expect(item).toEqual({
      id: "post_1",
      body: "축제 사진 자랑",
      imageUrl: "/uploads/posts/post_1/image.jpg",
      createdAt: createdAt.toISOString(),
      authorId: "user_1",
      boothName: "은하 카페",
      boothLocation: "본관 1층",
      authorNickname: "은하토끼",
      heartCount: 5,
      viewerHasHeart: true,
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
        nickname: "별빛여우",
      },
      _count: {
        hearts: 0,
      },
      hearts: [],
    });

    expect(item).toEqual({
      id: "post_2",
      body: "이미지 없이도 게시됩니다.",
      imageUrl: null,
      createdAt: createdAt.toISOString(),
      authorId: "user_2",
      boothName: "이름 없는 부스",
      boothLocation: null,
      authorNickname: "별빛여우",
      heartCount: 0,
      viewerHasHeart: false,
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
      "/uploads/posts/post_3/image.png",
    );
    expect(toPublicImageUrl("uploads/posts/post_3/image.png")).toBe(
      "/uploads/posts/post_3/image.png",
    );
  });
});
