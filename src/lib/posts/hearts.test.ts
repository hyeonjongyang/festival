import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostNotFoundError } from "@/lib/posts/errors";
import { togglePostHeart } from "@/lib/posts/hearts";

const postQueries = {
  findUnique: vi.fn(),
};

const heartQueries = {
  findUnique: vi.fn(),
  delete: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
};

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      $transaction: async (callback: (tx: unknown) => unknown) => {
        return callback({
          post: postQueries,
          heart: heartQueries,
        });
      },
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  postQueries.findUnique.mockResolvedValue({ id: "post_1" });
  heartQueries.findUnique.mockResolvedValue(null);
  heartQueries.create.mockResolvedValue({ id: "heart_1" });
  heartQueries.delete.mockResolvedValue(undefined);
  heartQueries.count.mockResolvedValue(0);
});

describe("togglePostHeart", () => {
  it("creates a heart when none exists", async () => {
    heartQueries.count.mockResolvedValue(1);

    const result = await togglePostHeart({
      postId: "post_1",
      userId: "user_1",
    });

    expect(heartQueries.create).toHaveBeenCalledWith({
      data: { postId: "post_1", userId: "user_1" },
    });
    expect(heartQueries.delete).not.toHaveBeenCalled();
    expect(result).toEqual({ hearted: true, totalHearts: 1 });
  });

  it("removes an existing heart", async () => {
    heartQueries.findUnique.mockResolvedValue({ id: "heart_1" });
    heartQueries.count.mockResolvedValue(0);

    const result = await togglePostHeart({
      postId: "post_1",
      userId: "user_1",
    });

    expect(heartQueries.delete).toHaveBeenCalledWith({
      where: {
        postId_userId: {
          postId: "post_1",
          userId: "user_1",
        },
      },
    });
    expect(heartQueries.create).not.toHaveBeenCalled();
    expect(result).toEqual({ hearted: false, totalHearts: 0 });
  });

  it("throws when the post is missing", async () => {
    postQueries.findUnique.mockResolvedValue(null);

    await expect(
      togglePostHeart({ postId: "missing", userId: "user_1" }),
    ).rejects.toBeInstanceOf(PostNotFoundError);
  });
});
